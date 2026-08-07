// A stand-in AWS Secrets Manager, for the CI cluster only.
//
// deploy/overlays/tls-awssm reads server certificates from Secrets Manager at
// pod start. There is no Secrets Manager on a kind cluster and no AWS account
// CI can reach, so without this the overlay would ship having never rolled
// out — which is the thing AIRGAP.md §11 explicitly refuses to call a
// capability.
//
// It speaks enough of the wire format to be a fair test of deploy/aws-sigv4.js
// and deploy/secrets-init.js: a POST carrying X-Amz-Target and a JSON body
// with SecretId, answered with SecretString or a modelled error. It does NOT
// verify the SigV4 signature — it asserts the request was signed and
// well-formed, which is what the client is responsible for. Verifying the
// signature would mean reimplementing the server side of SigV4 to prove the
// client side, and a bug common to both would cancel out.
//
// NOT part of the shipped images. Mounted from a ConfigMap in CI.
const http = require('node:http');
const fs = require('node:fs');

// /certs in the cluster, overridable so the same file can be exercised on a
// workstation before it is trusted in CI.
const CERT_DIR = process.env.STUB_CERT_DIR || '/certs';
const PORT = Number(process.env.STUB_PORT || 8080);

const CERT = fs.readFileSync(`${CERT_DIR}/tls.crt`, 'utf8').trim();
const KEY = fs.readFileSync(`${CERT_DIR}/tls.key`, 'utf8').trim();

// The layouts the real secrets might arrive in. The overlay is smoked against
// each, because which one the Sponsor's account uses is not known.
const SECRETS = {
  'imax/cert': CERT,
  'imax/key': KEY,
  'imax/ca': CERT,
  'imax/combined': `${CERT}\n${KEY}\n`,
  'imax/json': JSON.stringify({ 'tls.crt': CERT, 'tls.key': KEY, 'ca.pem': CERT }),
};

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const reply = (status, obj) => {
      res.writeHead(status, { 'content-type': 'application/x-amz-json-1.1' });
      res.end(JSON.stringify(obj));
    };

    // Prove the client sent a signed, correctly targeted request. A silent
    // pass here would let an unsigned client look healthy in CI and fail only
    // against the real endpoint, which is the one place we cannot iterate.
    const auth = req.headers.authorization || '';
    if (!/^AWS4-HMAC-SHA256 Credential=\S+, SignedHeaders=\S+, Signature=[0-9a-f]{64}$/.test(auth)) {
      console.error(`unsigned or malformed Authorization: ${auth.slice(0, 80)}`);
      return reply(400, { __type: 'IncompleteSignature' });
    }
    if (req.headers['x-amz-target'] !== 'secretsmanager.GetSecretValue') {
      return reply(400, { __type: 'UnknownOperationException' });
    }

    let id;
    try { id = JSON.parse(body).SecretId; } catch { return reply(400, { __type: 'InvalidRequestException' }); }

    if (!Object.prototype.hasOwnProperty.call(SECRETS, id)) {
      console.error(`no such secret: ${id}`);
      return reply(400, { __type: 'ResourceNotFoundException' });
    }
    console.log(`GetSecretValue ${id}`);
    return reply(200, { Name: id, SecretString: SECRETS[id] });
  });
});

server.listen(PORT, () => console.log(`sm-stub listening on :${PORT}`));
