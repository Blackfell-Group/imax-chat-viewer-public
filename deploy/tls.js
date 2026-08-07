// Optional TLS for any pod in the set.
//
// The enclave may require every connection to be TLS — not only the ingress
// hop, but pod-to-pod as well. Both entrypoints (spa-entry.js, mock-entry.js)
// read this, so turning TLS on is mounting a certificate and setting two
// variables; there is no separate "TLS build".
//
//   TLS_CERT_FILE   PEM certificate (or chain). Presence turns TLS ON.
//   TLS_KEY_FILE    PEM private key.
//   TLS_CA_FILE     PEM CA bundle. Optional; also used to verify upstreams.
//   TLS_CLIENT_AUTH require | request | none   (default: none)
//                   `require` is mutual TLS: clients must present a cert
//                   signed by TLS_CA_FILE.
//
// Certificates are environment material and never live in this repository —
// they arrive as a mounted Secret. See AIRGAP.md §10.

const fs = require('node:fs');

const CERT = process.env.TLS_CERT_FILE || '';
const KEY = process.env.TLS_KEY_FILE || '';
const CA = process.env.TLS_CA_FILE || '';
const CLIENT_AUTH = (process.env.TLS_CLIENT_AUTH || 'none').toLowerCase();

const enabled = !!(CERT && KEY);

function readOrDie(file, label) {
  try {
    return fs.readFileSync(file);
  } catch (err) {
    // Fail loudly at startup rather than serving plaintext on a port the
    // cluster believes is TLS — a silent downgrade is the worst outcome here.
    console.error(`TLS ${label} unreadable (${file}): ${err.message}`);
    process.exit(1);
  }
}

/** Server options for https.createServer, or null when TLS is off. */
function serverOptions() {
  if (!enabled) return null;
  const opts = {
    cert: readOrDie(CERT, 'certificate'),
    key: readOrDie(KEY, 'key'),
  };
  if (CA) opts.ca = readOrDie(CA, 'CA bundle');
  if (CLIENT_AUTH === 'require') {
    opts.requestCert = true;
    opts.rejectUnauthorized = true;
  } else if (CLIENT_AUTH === 'request') {
    opts.requestCert = true;
    opts.rejectUnauthorized = false;
  }
  return opts;
}

/**
 * Trust material for calls this pod MAKES (edge → enrichment pods). Uses the
 * same CA bundle, so one mounted Secret covers both directions.
 */
function clientOptions() {
  return CA ? { ca: readOrDie(CA, 'CA bundle') } : {};
}

/** Create an http or https server for `app`, whichever is configured. */
function createServer(app) {
  if (!enabled) return require('node:http').createServer(app);
  return require('node:https').createServer(serverOptions(), app);
}

function describe() {
  if (!enabled) return 'TLS off (plaintext; the front terminates)';
  return `TLS on (cert ${CERT}` +
    (CA ? `, CA ${CA}` : '') +
    (CLIENT_AUTH !== 'none' ? `, client-auth ${CLIENT_AUTH}` : '') + ')';
}

module.exports = { enabled, serverOptions, clientOptions, createServer, describe, scheme: enabled ? 'https' : 'http' };
