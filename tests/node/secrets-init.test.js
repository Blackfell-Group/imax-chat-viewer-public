// Secret-shape interpretation and SigV4 signing — deploy/secrets-init.js and
// deploy/aws-sigv4.js.
//
// Run: npm run test:node   (node --test, no extra dependency)
//
// Tested here rather than only in the cluster because the thing most likely to
// be wrong on deploy day is the SHAPE of a secret we did not author. We know
// the material may arrive as two secrets or as one, as raw PEM or as JSON
// under key names we do not control, and none of that is discoverable until
// someone points this at the real account. Every layout it claims to handle is
// therefore proven here, and every refusal names the secret.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');

const { interpret, payloadOf, validate } = require(
  path.join(__dirname, '..', '..', 'deploy', 'secrets-init.js'));
const { _internals } = require(
  path.join(__dirname, '..', '..', 'deploy', 'aws-sigv4.js'));

// Real, throwaway material. Generated rather than pasted so the test proves
// parsing against genuine PEM instead of against a string that looks like it.
const pair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const KEY_PEM = pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).trim();
const CERT_PEM = [
  '-----BEGIN CERTIFICATE-----',
  Buffer.from('not a real certificate body, only the frame matters here').toString('base64'),
  '-----END CERTIFICATE-----',
].join('\n');

// --- secret shapes ---------------------------------------------------------

test('one secret carrying both cert and key splits into two files', () => {
  const parts = interpret(`${CERT_PEM}\n${KEY_PEM}\n`, 'combined');
  assert.equal(parts.shape, 'pem (cert+key)');
  assert.match(parts.cert, /BEGIN CERTIFICATE/);
  assert.match(parts.key, /BEGIN PRIVATE KEY/);
  // The key must not leak into the cert file or vice versa.
  assert.equal(/PRIVATE KEY/.test(parts.cert), false);
  assert.equal(/CERTIFICATE/.test(parts.key), false);
});

test('the two-secret layout yields one thing per secret', () => {
  const c = interpret(CERT_PEM, 'servercerts/dev/crt.pem');
  assert.equal(c.shape, 'pem');
  assert.match(c.cert, /BEGIN CERTIFICATE/);
  assert.equal(c.key, undefined);

  const k = interpret(KEY_PEM, 'servercerts/dev/key.pem');
  assert.match(k.key, /BEGIN PRIVATE KEY/);
  assert.equal(k.cert, undefined);
});

test('a certificate chain keeps every certificate in order', () => {
  const chain = `${CERT_PEM}\n${CERT_PEM}\n`;
  const parts = interpret(chain, 'fullchain');
  assert.equal((parts.cert.match(/BEGIN CERTIFICATE/g) || []).length, 2);
});

test('JSON secrets resolve under any of the known key spellings', () => {
  for (const [certKey, keyKey] of [
    ['tls.crt', 'tls.key'],
    ['cert', 'key'],
    ['certificate', 'privateKey'],
    ['crt', 'private_key'],
  ]) {
    const parts = interpret(JSON.stringify({ [certKey]: CERT_PEM, [keyKey]: KEY_PEM }), 'json');
    assert.equal(parts.shape, 'json', `${certKey}/${keyKey}`);
    assert.match(parts.cert, /BEGIN CERTIFICATE/, certKey);
    assert.match(parts.key, /BEGIN PRIVATE KEY/, keyKey);
  }
});

test('a JSON secret can also carry the CA', () => {
  const parts = interpret(JSON.stringify({ 'tls.crt': CERT_PEM, 'ca.pem': CERT_PEM }), 'json');
  assert.match(parts.ca, /BEGIN CERTIFICATE/);
});

// The Sponsor's secret is JSON holding a cert and a key, both base64. That is
// the sane way to put a PEM in JSON — the alternative is escaping every
// newline — and the first version of this shipped without handling it.
const b64 = (s) => Buffer.from(s).toString('base64');

test('JSON with base64 cert and key, the layout the Sponsor uses', () => {
  const parts = interpret(
    JSON.stringify({ 'tls.crt': b64(CERT_PEM), 'tls.key': b64(KEY_PEM) }), 'aws/json');
  assert.equal(parts.shape, 'json');
  assert.match(parts.cert, /BEGIN CERTIFICATE/);
  assert.match(parts.key, /BEGIN PRIVATE KEY/);
  // The failure that would not name itself: a key written into tls.crt.
  assert.equal(/PRIVATE KEY/.test(parts.cert), false);
  assert.equal(/CERTIFICATE/.test(parts.key), false);
});

test('one base64 field holding both blocks is split, not copied whole', () => {
  const parts = interpret(
    JSON.stringify({ certificate: b64(`${CERT_PEM}\n${KEY_PEM}`) }), 'aws/combined');
  assert.match(parts.cert, /BEGIN CERTIFICATE/);
  assert.match(parts.key, /BEGIN PRIVATE KEY/);
  assert.equal(/PRIVATE KEY/.test(parts.cert), false);
});

test('base64 and literal PEM can be mixed in one secret', () => {
  const parts = interpret(
    JSON.stringify({ 'tls.crt': CERT_PEM, 'tls.key': b64(KEY_PEM) }), 'aws/mixed');
  assert.match(parts.cert, /BEGIN CERTIFICATE/);
  assert.match(parts.key, /BEGIN PRIVATE KEY/);
});

test('a value that is neither PEM nor base64 PEM is refused, not mangled', () => {
  // Buffer.from(x,'base64') ignores unrecognised characters and returns garbage
  // rather than throwing, so without an explicit check this would sail through
  // and fail later as an opaque TLS error.
  assert.throws(
    () => interpret(JSON.stringify({ 'tls.crt': 'bm90IGEgcGVt' }), 'aws/bad'),
    /aws\/bad.*neither PEM nor base64-encoded PEM/,
  );
});

test('SecretBinary is decoded before interpretation', () => {
  const raw = payloadOf({ SecretBinary: Buffer.from(CERT_PEM).toString('base64') }, 'bin');
  assert.match(interpret(raw, 'bin').cert, /BEGIN CERTIFICATE/);
});

test('SecretString wins when both fields are present', () => {
  const raw = payloadOf({ SecretString: 'from-string', SecretBinary: 'aWdub3JlZA==' }, 'both');
  assert.equal(raw, 'from-string');
});

// --- refusals, each naming the secret --------------------------------------

test('an empty secret is refused by name', () => {
  assert.throws(() => payloadOf({}, 'servercerts/dev/crt.pem'),
    /servercerts\/dev\/crt\.pem.*empty/);
});

test('DER is refused with the conversion command', () => {
  // A DER file is binary and will not parse as JSON — the exact case
  // deploy/enclave-ca.sh already guards against on its own input.
  assert.throws(() => interpret('0èbinary', 'der-secret'),
    /der-secret.*neither PEM nor JSON[\s\S]*openssl x509 -inform der/);
});

test('JSON under unrecognised key names lists what it did find', () => {
  assert.throws(
    () => interpret(JSON.stringify({ publicCert: CERT_PEM, secretKey: KEY_PEM }), 'odd-names'),
    /odd-names.*none of the expected keys.*publicCert, secretKey/,
  );
});

test('a PEM header with no usable block is refused', () => {
  assert.throws(() => interpret('-----BEGIN NONSENSE-----\nx\n-----END NONSENSE-----', 'weird'),
    /weird.*no certificate or private key block/);
});

test('JSON that is not an object is refused', () => {
  assert.throws(() => interpret('["a"]', 'arr'), /arr.*not an object/);
});

test('validate refuses material of the wrong kind', () => {
  // The failure this prevents: writing a certificate into tls.key, which
  // surfaces much later as an opaque TLS handshake error.
  assert.throws(() => validate('key', CERT_PEM, 'swapped'), /swapped.*no PRIVATE KEY block/);
  assert.throws(() => validate('certificate', KEY_PEM, 'swapped'), /swapped.*no CERTIFICATE block/);
  validate('certificate', CERT_PEM, 'ok');
  validate('key', KEY_PEM, 'ok');
});

// --- SigV4 -----------------------------------------------------------------
//
// AWS publishes a worked example for the signing key derivation (the
// "AWS4-HMAC-SHA256" signature-version-4 test suite). Checking against it
// proves the derivation is right independently of any live endpoint — which
// matters, because the first chance to test against the real one is in the
// target environment.

test('the signing key derivation matches the AWS published vector', () => {
  const { hmac } = _internals;
  const secret = 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY';
  const kDate = hmac(`AWS4${secret}`, '20150830');
  const kRegion = hmac(kDate, 'us-east-1');
  const kService = hmac(kRegion, 'iam');
  const kSigning = hmac(kService, 'aws4_request');
  assert.equal(
    kSigning.toString('hex'),
    'c4afb1cc5771d871763a393e44b703571b55cc28424d1a5e86da6ed3c154a4b9',
  );
});

test('the string-to-sign hash matches the AWS published vector', () => {
  const { sha256 } = _internals;
  const canonicalRequest = [
    'GET',
    '/',
    'Action=ListUsers&Version=2010-05-08',
    'content-type:application/x-www-form-urlencoded; charset=utf-8',
    'host:iam.amazonaws.com',
    'x-amz-date:20150830T123600Z',
    '',
    'content-type;host;x-amz-date',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  ].join('\n');
  assert.equal(
    sha256(canonicalRequest),
    'f536975d06c0309214f805bb90ccff089219ecd68b2577efef23edd43b7e1a59',
  );
});
