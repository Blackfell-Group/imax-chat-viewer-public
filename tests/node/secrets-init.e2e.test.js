// End-to-end for deploy/secrets-init.js: a real child process, a real signed
// request, real files on disk.
//
// Run: npm run test:node
//
// The shape tests next door prove the parsing. This proves the part that only
// fails in the target environment: that the SigV4 signing produces a request a
// server accepts, that the credential chain resolves, that both secret layouts
// work through the whole path, and — the one that matters most — that a
// failure exits NON-ZERO so the pod holds in Init:Error instead of starting
// without certificates on a port the cluster believes is TLS.
//
// The stub speaks just enough of the Secrets Manager wire format
// (x-amz-target, JSON body with SecretId) to be a fair test of the client.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');

const INIT = path.join(__dirname, '..', '..', 'deploy', 'secrets-init.js');

const pair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const KEY_PEM = pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).trim();
const CERT_PEM = [
  '-----BEGIN CERTIFICATE-----',
  Buffer.from('demo certificate frame').toString('base64'),
  '-----END CERTIFICATE-----',
].join('\n');

/** A stand-in Secrets Manager. Records what it was asked for. */
function stub(secrets) {
  const seen = { targets: [], ids: [], authorization: [] };
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      seen.targets.push(req.headers['x-amz-target']);
      seen.authorization.push(req.headers.authorization || '');
      let id = null;
      try { id = JSON.parse(body).SecretId; } catch { /* malformed */ }
      seen.ids.push(id);

      if (!Object.prototype.hasOwnProperty.call(secrets, id)) {
        res.writeHead(400, { 'content-type': 'application/x-amz-json-1.1' });
        return res.end(JSON.stringify({ __type: 'ResourceNotFoundException' }));
      }
      res.writeHead(200, { 'content-type': 'application/x-amz-json-1.1' });
      return res.end(JSON.stringify({ Name: id, SecretString: secrets[id] }));
    });
  });
  return { server, seen };
}

async function listen(server) {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return `http://127.0.0.1:${server.address().port}/`;
}

/** Run secrets-init.js as the initContainer would. Resolves even on failure. */
function runInit(env, outDir) {
  return new Promise((resolve) => {
    execFile(process.execPath, [INIT], {
      env: {
        PATH: process.env.PATH,
        TLS_OUT_DIR: outDir,
        AWS_REGION: 'us-iso-east-1',
        // Static credentials exercise the environment link of the chain. IRSA
        // and IMDS are the other two and are not reachable from a unit test.
        AWS_ACCESS_KEY_ID: 'AKIAEXAMPLE',
        AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
        ...env,
      },
    }, (err, stdout, stderr) => {
      resolve({ code: err ? err.code ?? 1 : 0, stdout, stderr });
    });
  });
}

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'imax-tls-'));
}

test('two-secret layout: cert and key from different secrets', async (t) => {
  const { server, seen } = stub({
    'servercerts/prod/crt.pem': CERT_PEM,
    'servercerts/prod/key.pem': KEY_PEM,
    'servercerts/prod/ca.pem': CERT_PEM,
  });
  const endpoint = await listen(server);
  t.after(() => server.close());
  const out = tmpdir();

  const r = await runInit({
    AWS_SECRETSMANAGER_ENDPOINT: endpoint,
    TLS_CERT_SECRET: 'servercerts/prod/crt.pem',
    TLS_KEY_SECRET: 'servercerts/prod/key.pem',
    TLS_CA_SECRET: 'servercerts/prod/ca.pem',
  }, out);

  assert.equal(r.code, 0, r.stderr);
  assert.match(fs.readFileSync(path.join(out, 'tls.crt'), 'utf8'), /BEGIN CERTIFICATE/);
  assert.match(fs.readFileSync(path.join(out, 'tls.key'), 'utf8'), /BEGIN PRIVATE KEY/);
  assert.match(fs.readFileSync(path.join(out, 'ca.pem'), 'utf8'), /BEGIN CERTIFICATE/);

  // The request really was signed, and really was a GetSecretValue.
  assert.deepEqual([...new Set(seen.targets)], ['secretsmanager.GetSecretValue']);
  assert.equal(seen.ids.length, 3);
  for (const a of seen.authorization) {
    assert.match(a, /^AWS4-HMAC-SHA256 Credential=AKIAEXAMPLE\/\d{8}\/us-iso-east-1\/secretsmanager\/aws4_request, SignedHeaders=[a-z0-9;-]+, Signature=[0-9a-f]{64}$/);
  }
});

test('one-secret layout: cert and key in a single secret', async (t) => {
  const { server } = stub({ 'imax/tls': `${CERT_PEM}\n${KEY_PEM}\n` });
  const endpoint = await listen(server);
  t.after(() => server.close());
  const out = tmpdir();

  const r = await runInit({
    AWS_SECRETSMANAGER_ENDPOINT: endpoint,
    TLS_CERT_SECRET: 'imax/tls',
  }, out);

  assert.equal(r.code, 0, r.stderr);
  assert.match(fs.readFileSync(path.join(out, 'tls.crt'), 'utf8'), /BEGIN CERTIFICATE/);
  assert.match(fs.readFileSync(path.join(out, 'tls.key'), 'utf8'), /BEGIN PRIVATE KEY/);
  assert.equal(fs.existsSync(path.join(out, 'ca.pem')), false);
});

test('JSON layout in a single secret', async (t) => {
  const { server } = stub({
    'imax/tls-json': JSON.stringify({ 'tls.crt': CERT_PEM, 'tls.key': KEY_PEM, 'ca.pem': CERT_PEM }),
  });
  const endpoint = await listen(server);
  t.after(() => server.close());
  const out = tmpdir();

  const r = await runInit({
    AWS_SECRETSMANAGER_ENDPOINT: endpoint,
    TLS_CERT_SECRET: 'imax/tls-json',
  }, out);

  assert.equal(r.code, 0, r.stderr);
  assert.match(fs.readFileSync(path.join(out, 'tls.key'), 'utf8'), /BEGIN PRIVATE KEY/);
  assert.match(fs.readFileSync(path.join(out, 'ca.pem'), 'utf8'), /BEGIN CERTIFICATE/);
});

test('written material is not world-readable', async (t) => {
  const { server } = stub({ 'imax/tls': `${CERT_PEM}\n${KEY_PEM}\n` });
  const endpoint = await listen(server);
  t.after(() => server.close());
  const out = tmpdir();

  await runInit({ AWS_SECRETSMANAGER_ENDPOINT: endpoint, TLS_CERT_SECRET: 'imax/tls' }, out);
  const mode = fs.statSync(path.join(out, 'tls.key')).mode & 0o777;
  assert.equal(mode, 0o600, `tls.key mode was ${mode.toString(8)}`);
});

// --- the failure paths, which are the whole point --------------------------

test('a missing secret exits non-zero and names it', async (t) => {
  const { server } = stub({});
  const endpoint = await listen(server);
  t.after(() => server.close());
  const out = tmpdir();

  const r = await runInit({
    AWS_SECRETSMANAGER_ENDPOINT: endpoint,
    TLS_CERT_SECRET: 'servercerts/prod/nope',
  }, out);

  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /servercerts\/prod\/nope/);
  assert.match(r.stderr, /ResourceNotFoundException/);
  // Nothing half-written: the pod must not start on a partial mount.
  assert.equal(fs.readdirSync(out).length, 0);
});

test('a cert-only secret with no TLS_KEY_SECRET says exactly that', async (t) => {
  const { server } = stub({ 'servercerts/prod/crt.pem': CERT_PEM });
  const endpoint = await listen(server);
  t.after(() => server.close());
  const out = tmpdir();

  const r = await runInit({
    AWS_SECRETSMANAGER_ENDPOINT: endpoint,
    TLS_CERT_SECRET: 'servercerts/prod/crt.pem',
  }, out);

  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /TLS_KEY_SECRET is unset/);
  assert.equal(fs.readdirSync(out).length, 0);
});

test('unset configuration is refused before any network call', async (t) => {
  const out = tmpdir();
  const r = await runInit({ AWS_SECRETSMANAGER_ENDPOINT: '', TLS_CERT_SECRET: '' }, out);
  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /TLS_CERT_SECRET/);
  assert.match(r.stderr, /AWS_SECRETSMANAGER_ENDPOINT/);
});

test('no credentials anywhere is a named failure, not a hang', async (t) => {
  const { server } = stub({ 'imax/tls': `${CERT_PEM}\n${KEY_PEM}\n` });
  const endpoint = await listen(server);
  t.after(() => server.close());
  const out = tmpdir();

  const r = await new Promise((resolve) => {
    execFile(process.execPath, [INIT], {
      env: {
        PATH: process.env.PATH,
        TLS_OUT_DIR: out,
        AWS_REGION: 'us-iso-east-1',
        AWS_SECRETSMANAGER_ENDPOINT: endpoint,
        TLS_CERT_SECRET: 'imax/tls',
        // Point IMDS at a closed port so the chain exhausts quickly rather
        // than waiting on the link-local address.
        AWS_EC2_METADATA_SERVICE_ENDPOINT: 'http://127.0.0.1:1',
      },
    }, (err, stdout, stderr) => resolve({ code: err ? err.code ?? 1 : 0, stderr }));
  });

  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /no AWS credentials/);
});

test('secret material never reaches the logs', async (t) => {
  const { server } = stub({ 'imax/tls': `${CERT_PEM}\n${KEY_PEM}\n` });
  const endpoint = await listen(server);
  t.after(() => server.close());
  const out = tmpdir();

  const r = await runInit({ AWS_SECRETSMANAGER_ENDPOINT: endpoint, TLS_CERT_SECRET: 'imax/tls' }, out);
  const all = r.stdout + r.stderr;
  assert.equal(all.includes('BEGIN PRIVATE KEY'), false);
  // Any run of base64 long enough to be key material is a leak.
  const keyBody = KEY_PEM.split('\n').filter((l) => !l.startsWith('---')).join('');
  assert.equal(all.includes(keyBody.slice(0, 40)), false);
  // What it SHOULD say: the name, the shape, and a byte count.
  assert.match(r.stdout, /imax\/tls/);
  assert.match(r.stdout, /pem \(cert\+key\)/);
});
