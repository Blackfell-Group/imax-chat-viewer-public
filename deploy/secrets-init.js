// Fetch server certificate material from AWS Secrets Manager and write it
// where deploy/tls.js expects to find it. Runs as an initContainer, writes,
// exits — nothing long-lived, no code path in the serving image.
//
// deploy/tls.js is deliberately untouched by this. It reads PEM files from
// TLS_CERT_FILE / TLS_KEY_FILE / TLS_CA_FILE, synchronously, at import, and
// hard-exits if any is unreadable. That contract is what makes this cheap:
// the overlay swaps the SOURCE of /etc/tls from a mounted Secret to an
// in-memory emptyDir that this fills. Every documented failure mode survives —
// if this exits non-zero the pod holds in Init:Error and never reaches a state
// where it could serve plaintext on a port the cluster believes is TLS.
//
//   TLS_CERT_SECRET   secret holding the certificate (or cert AND key)
//   TLS_KEY_SECRET    secret holding the private key. LEAVE UNSET when one
//                     secret carries both — that layout is detected.
//   TLS_CA_SECRET     secret holding the CA bundle. Optional.
//   TLS_OUT_DIR       where to write. Default /etc/tls.
//   AWS_REGION                    e.g. us-iso-east-1
//   AWS_SECRETSMANAGER_ENDPOINT   full base URL of the regional endpoint
//
// The endpoint is configuration rather than something derived from the region,
// because the hostname pattern for the target region is one that
// scripts/preflight-airgap.sh refuses to let into this repository.
//
// NOTHING HERE LOGS SECRET MATERIAL. Log lines carry the secret's name, the
// detected shape, and a byte count. Those three are enough to diagnose every
// failure this has, and none of them is the key.

const fs = require('node:fs');
const path = require('node:path');
const aws = require('./aws-sigv4');

const OUT_DIR = process.env.TLS_OUT_DIR || '/etc/tls';
const REGION = process.env.AWS_REGION || '';
const ENDPOINT = process.env.AWS_SECRETSMANAGER_ENDPOINT || '';

const CERT_SECRET = process.env.TLS_CERT_SECRET || '';
const KEY_SECRET = process.env.TLS_KEY_SECRET || '';
const CA_SECRET = process.env.TLS_CA_SECRET || '';

const CERT_RE = /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g;
const KEY_RE = /-----BEGIN (?:RSA |EC |ENCRYPTED )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC |ENCRYPTED )?PRIVATE KEY-----/;

// Key names seen in the wild for the same three things. Tolerating all of them
// costs a lookup and removes an entire category of deploy-day failure, since
// we do not control how the Sponsor's secret was authored.
const ALIASES = {
  cert: ['tls.crt', 'crt', 'cert', 'certificate', 'certificatePem', 'cert.pem', 'fullchain'],
  key: ['tls.key', 'key', 'privateKey', 'private_key', 'key.pem', 'privateKeyPem'],
  ca: ['ca.pem', 'ca', 'caBundle', 'ca_bundle', 'chain', 'certificateChain'],
};

/** The payload of a GetSecretValue result, as a string, whichever field carried it. */
function payloadOf(result, name) {
  if (typeof result.SecretString === 'string' && result.SecretString.length) {
    return result.SecretString;
  }
  if (typeof result.SecretBinary === 'string' && result.SecretBinary.length) {
    return Buffer.from(result.SecretBinary, 'base64').toString('utf8');
  }
  throw new Error(`secret "${name}" is empty — neither SecretString nor SecretBinary carried a value`);
}

/**
 * A JSON secret may hold its PEMs base64-encoded rather than literally — which
 * is the sane thing to do, because a PEM is multi-line and embedding one in
 * JSON otherwise means escaping every newline. Both spellings are accepted:
 * a value that already looks like PEM is used as-is, anything else is
 * base64-decoded and then has to look like PEM.
 *
 * Decoding is not attempted blindly. Buffer.from(x, 'base64') silently ignores
 * characters it does not recognise and returns garbage rather than throwing, so
 * a wrong value would otherwise sail through and fail much later as an opaque
 * TLS error. The decoded bytes must carry a PEM header or this refuses.
 */
function decodeIfBase64(value, name, kind) {
  if (!value) return null;
  if (value.includes('-----BEGIN')) return value;

  const decoded = Buffer.from(value, 'base64').toString('utf8').trim();
  if (decoded.includes('-----BEGIN')) return decoded;

  throw new Error(
    `secret "${name}" carries a ${kind} that is neither PEM nor base64-encoded PEM `
    + `(${value.length} chars, starts "${value.slice(0, 12)}…"). Expected either the `
    + 'PEM text itself or its base64.',
  );
}

/**
 * Interpret one secret's payload. Returns whichever of {cert, key, ca} it
 * carried, so a single secret holding both a certificate and a key resolves in
 * one call and a per-PEM layout resolves in three.
 */
function interpret(raw, name) {
  const text = raw.trim();

  // Shape 1: raw PEM. A combined cert+key blob is the one-secret layout.
  if (text.startsWith('-----BEGIN')) {
    const certs = text.match(CERT_RE);
    const key = text.match(KEY_RE);
    const out = {};
    if (certs) out.cert = `${certs.join('\n')}\n`;
    if (key) out.key = `${key[0]}\n`;
    if (!certs && !key) {
      throw new Error(`secret "${name}" starts with a PEM header but contains no certificate or private key block`);
    }
    return { shape: certs && key ? 'pem (cert+key)' : 'pem', ...out };
  }

  // Shape 2: JSON. Look for each thing under any of its known spellings.
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    // Not PEM and not JSON. Overwhelmingly this is DER, which is the failure
    // deploy/enclave-ca.sh already learned to name explicitly rather than let
    // surface later as a TLS handshake error.
    throw new Error(
      `secret "${name}" is neither PEM nor JSON. If it is DER, convert it:\n`
      + '       openssl x509 -inform der -in <file> -out cert.pem',
    );
  }
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error(`secret "${name}" is JSON but not an object of PEM values`);
  }

  const pick = (names) => {
    for (const n of names) {
      if (typeof obj[n] === 'string' && obj[n].trim()) return obj[n].trim();
    }
    return null;
  };
  const out = {};
  const cert = decodeIfBase64(pick(ALIASES.cert), name, 'certificate');
  const key = decodeIfBase64(pick(ALIASES.key), name, 'key');
  const ca = decodeIfBase64(pick(ALIASES.ca), name, 'CA');

  // A single field can decode to BOTH blocks — a cert+key bundle stored under
  // one key. Split rather than copy verbatim, or the private key would be
  // written into tls.crt, which fails in a way that does not name itself.
  if (cert) {
    const certs = cert.match(CERT_RE);
    const embedded = cert.match(KEY_RE);
    if (certs) out.cert = `${certs.join('\n')}\n`;
    if (embedded && !key) out.key = `${embedded[0]}\n`;
  }
  if (key) {
    const k = key.match(KEY_RE);
    out.key = k ? `${k[0]}\n` : `${key}\n`;
  }
  if (ca) {
    const c = ca.match(CERT_RE);
    out.ca = c ? `${c.join('\n')}\n` : `${ca}\n`;
  }

  if (!cert && !key && !ca) {
    throw new Error(
      `secret "${name}" is JSON but carries none of the expected keys. Found: `
      + `${Object.keys(obj).join(', ') || '(none)'}. Expected one of `
      + `${ALIASES.cert.join('/')} for the certificate.`,
    );
  }
  return { shape: 'json', ...out };
}

/** Refuse to write anything that is not what it claims to be. */
function validate(kind, pem, name) {
  const ok = kind === 'key' ? KEY_RE.test(pem) : /-----BEGIN CERTIFICATE-----/.test(pem);
  if (!ok) {
    throw new Error(
      `secret "${name}" did not yield a usable ${kind}: no `
      + `${kind === 'key' ? 'PRIVATE KEY' : 'CERTIFICATE'} block after decoding`,
    );
  }
}

function write(file, contents) {
  const target = path.join(OUT_DIR, file);
  try {
    // 0600: the serving container reads this as the same UID. The mount is an
    // in-memory emptyDir, so this never touches a disk.
    fs.writeFileSync(target, contents, { mode: 0o600 });
  } catch (err) {
    if (err.code === 'EACCES' || err.code === 'EPERM') {
      // Everything hard already worked — credentials resolved, the secret was
      // fetched and parsed — and the write failed because the volume is owned
      // by root and these images run as a non-root UID. Name the fix, because
      // "permission denied" on a directory the pod plainly has mounted sends
      // people looking at the wrong thing.
      throw new Error(
        `cannot write ${target}: ${err.code}. The volume is not writable by this `
        + 'UID — set fsGroup on the pod securityContext (the tls-awssm overlay '
        + 'sets fsGroup: 1000 for exactly this reason).',
      );
    }
    throw err;
  }
  console.log(`wrote ${target} (${Buffer.byteLength(contents)} bytes)`);
}

async function main() {
  const problems = [];
  if (!CERT_SECRET) problems.push('TLS_CERT_SECRET');
  if (!REGION) problems.push('AWS_REGION');
  if (!ENDPOINT) problems.push('AWS_SECRETSMANAGER_ENDPOINT');
  if (problems.length) {
    throw new Error(
      `missing required configuration: ${problems.join(', ')}. `
      + 'Set them in the imax-tls-source ConfigMap.',
    );
  }

  const credentials = await aws.resolveCredentials({ region: REGION });
  console.log(`credentials: ${credentials.source}`);

  const fetched = {};
  const load = async (secretId, label) => {
    const result = await aws.getSecretValue({
      endpoint: ENDPOINT, region: REGION, secretId, credentials,
    });
    const parts = interpret(payloadOf(result, secretId), secretId);
    console.log(`${label}: "${secretId}" → ${parts.shape}, carried ${
      ['cert', 'key', 'ca'].filter((k) => parts[k]).join('+') || 'nothing usable'}`);
    return parts;
  };

  const certParts = await load(CERT_SECRET, 'certificate');
  Object.assign(fetched, certParts);

  if (KEY_SECRET) {
    // Two-secret layout. The key secret wins for the key, but must not quietly
    // replace a certificate the first secret already provided.
    const keyParts = await load(KEY_SECRET, 'key');
    if (keyParts.key) fetched.key = keyParts.key;
    if (!fetched.cert && keyParts.cert) fetched.cert = keyParts.cert;
    if (!fetched.ca && keyParts.ca) fetched.ca = keyParts.ca;
  } else if (!fetched.key) {
    throw new Error(
      `TLS_KEY_SECRET is unset, so "${CERT_SECRET}" was expected to carry both the `
      + 'certificate and the private key, but no private key block was found. '
      + 'Set TLS_KEY_SECRET if the key lives in its own secret.',
    );
  }

  if (CA_SECRET) {
    const caParts = await load(CA_SECRET, 'CA bundle');
    // A CA secret is a certificate; accept it under either interpretation.
    fetched.ca = caParts.ca || caParts.cert || fetched.ca;
  }

  validate('certificate', fetched.cert || '', CERT_SECRET);
  validate('key', fetched.key || '', KEY_SECRET || CERT_SECRET);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  write('tls.crt', fetched.cert);
  write('tls.key', fetched.key);
  if (fetched.ca) {
    validate('certificate', fetched.ca, CA_SECRET);
    write('ca.pem', fetched.ca);
  } else if (CA_SECRET) {
    throw new Error(`TLS_CA_SECRET is set to "${CA_SECRET}" but it yielded no CA certificate`);
  }

  console.log('certificate material staged; the pod may start');
}

// Only run when executed, so the unit tests can require the parsing helpers.
if (require.main === module) {
  main().catch((err) => {
    console.error(`secrets-init: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { interpret, payloadOf, validate, decodeIfBase64, ALIASES };
