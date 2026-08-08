// SPA pod edge. Replaces the nginx reverse proxy.
//
// nginx was doing four things — serve the bundle with SPA fallback, answer
// /healthz, and proxy six path prefixes to five upstreams. That bought a second
// base image, a second package ecosystem to patch and scan, and a second thing
// for the enclave's yard to approve. Express does the same in one file on the
// same Node base as the five enrichment pods, and gives the identity headers a
// place to live.
//
//   PORT                  default 8443
//   UPSTREAM_<SERVICE>    override a service host (default: cluster DNS names)
//   plus everything in identity.js
//
// TLS is terminated by the enclave front, as it is for every other service
// here; 8443 is the convention, not an assertion that this process speaks TLS.

const express = require('express');
const http = require('node:http');
const https = require('node:https');
const path = require('node:path');
const identity = require('./identity');
const tls = require('./tls');

const PORT = Number(process.env.PORT || 8443);
const STATIC_ROOT = process.env.STATIC_ROOT || path.join(__dirname, 'public');

// Scheme for the hop to the enrichment pods. Independent of this pod's own
// TLS: the enclave may require plaintext-free pod-to-pod traffic, or may
// terminate everything at the front and leave the mesh internal.
const UPSTREAM_SCHEME = (process.env.UPSTREAM_SCHEME || 'http').toLowerCase();

// Path prefix -> upstream. Production cutover replaces these hosts with the production
// service endpoints; the client never changes because the contracts are frozen.
const UPSTREAMS = [
  ['/api/search', process.env.UPSTREAM_SEARCH || 'imax-mock-search:5177'],
  ['/api/translate', process.env.UPSTREAM_TRANSLATION || 'imax-mock-translation:5177'],
  ['/api/entities', process.env.UPSTREAM_ENTITIES || 'imax-mock-entities:5177'],
  ['/api/summarize', process.env.UPSTREAM_SUMMARIZE || 'imax-mock-summarize:5177'],
  ['/api/ocr', process.env.UPSTREAM_OCR || 'imax-mock-ocr:5177'],
  ['/static', process.env.UPSTREAM_OCR || 'imax-mock-ocr:5177'],
];

const app = express();
app.disable('x-powered-by');

// Liveness/readiness must answer before any auth check — a probe carries no
// identity, and gating it would make the pod restart forever.
app.get('/healthz', (_req, res) => res.json({ ok: true, service: 'imax-spa' }));

app.use(identity.middleware());

app.get('/api/whoami', (req, res) => res.json(identity.describe(req.identity)));

/**
 * Stream a request to an upstream and stream the response back. Hand-rolled
 * rather than pulled from npm: it is thirty lines, and every dependency here is
 * one more package the enclave's mirror has to carry.
 */
function proxy(targetAuthority) {
  const [host, port] = targetAuthority.split(':');
  const secure = UPSTREAM_SCHEME === 'https';
  const transport = secure ? https : http;
  // Trust the enclave CA for upstream verification — same bundle that secures
  // the inbound side, so one mounted Secret covers both directions.
  const trust = secure ? tls.clientOptions() : {};
  return (req, res) => {
    const headers = { ...req.headers, host: targetAuthority };
    const upstream = transport.request(
      {
        ...trust,
        host,
        port: Number(port) || (secure ? 443 : 80),
        method: req.method,
        path: req.originalUrl,
        headers,
      },
      (up) => {
        res.writeHead(up.statusCode || 502, up.headers);
        up.pipe(res);
      },
    );
    upstream.on('error', (err) => {
      // Include the code: TLS failures often carry an empty message, and
      // ECONNREFUSED vs UNABLE_TO_VERIFY_LEAF_SIGNATURE is the whole diagnosis
      // when someone is debugging this inside the enclave.
      console.error(
        `upstream ${UPSTREAM_SCHEME}://${targetAuthority} failed: ${err.code || ''} ${err.message}`.trim(),
      );
      if (!res.headersSent) res.status(502).json({ error: 'upstream unavailable' });
      else res.end();
    });
    req.pipe(upstream);
  };
}

for (const [prefix, target] of UPSTREAMS) app.use(prefix, proxy(target));

// Static bundle, then SPA fallback for client-side routes.
app.use(express.static(STATIC_ROOT, { index: 'index.html' }));
app.get(/.*/, (_req, res) => res.sendFile(path.join(STATIC_ROOT, 'index.html')));

tls.createServer(app).listen(PORT, () => {
  console.log(`imax-spa listening on ${tls.scheme}://:${PORT} — ${tls.describe()}`);
  console.log(`upstream scheme: ${UPSTREAM_SCHEME}`);
  console.log(identity.describeMode());
});
