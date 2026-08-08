// Per-service pod entry for the target environment: each enrichment service runs as its
// own single-responsibility container (see server.js for the local all-in-one
// dev topology). SERVICE selects the route module; /healthz feeds the
// liveness/readiness probes; the OCR pod additionally serves the binary
// fixtures under /static. Stateless by design — seed data is baked in, all
// officer work-state lives in the browser session.
const express = require('express');
const path = require('path');
const tls = require('./tls');

const SERVICE = process.env.SERVICE;
const ROUTES = {
  search: '/api/search',
  translation: '/api/translate',
  entities: '/api/entities',
  summarize: '/api/summarize',
  ocr: '/api/ocr',
};

const route = ROUTES[SERVICE];
if (!route) {
  console.error(`unknown SERVICE "${SERVICE}" — expected one of: ${Object.keys(ROUTES).join(', ')}`);
  process.exit(1);
}

const app = express();
app.use(express.json());

app.get('/healthz', (req, res) => res.json({ ok: true, service: `imax-mock-${SERVICE}` }));
if (SERVICE === 'ocr') {
  app.use('/static', express.static(path.join(__dirname, 'static')));
}
app.use(route, require(`./routes/${SERVICE}`));

const PORT = process.env.PORT || 5177;
// TLS is off unless a certificate is mounted — see deploy/tls.js. The enclave
// may require pod-to-pod traffic to be encrypted too, not just the ingress hop.
tls.createServer(app).listen(PORT, () => {
  console.log(`imax-mock-${SERVICE} listening on ${tls.scheme}://:${PORT} — ${tls.describe()}`);
  // Only these two call the gateway; the others would report "off" every time
  // and train the reader to ignore the line.
  if (SERVICE === 'translation' || SERVICE === 'ocr') {
    // Same catalogue check the local server runs, in the deployed pod where it
    // matters more: nobody is watching a terminal, so the pod log is the only
    // place a wrong model name or an unset vision model can be noticed before
    // an officer meets it.
    require('./providers/model-gateway')
      .preflight()
      .then((lines) => lines.forEach((l) => console.log(l)))
      .catch((err) => console.warn(`model gateway preflight skipped: ${err.message}`));
  }
});
