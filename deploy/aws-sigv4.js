// Minimal AWS SigV4 request signing and credential resolution.
//
// WHY THIS EXISTS INSTEAD OF @aws-sdk/client-secrets-manager. The SDK would
// pull roughly forty transitive packages into deploy/mock-package-lock.json.
// Every one of them then has to be carried by the enclave's curated npm mirror
// (Dockerfile.mock installs with `npm ci` against that lock), cleared through
// the trivy CRITICAL gate, and re-inventoried on each bump. What we actually
// need is one signed POST. That trade — a page of crypto we own versus a
// dependency tree the enclave has to approve — is the same one this repository
// already made when it dropped nginx for an Express edge.
//
// NO HOSTNAME APPEARS HERE. The Secrets Manager endpoint in the target region
// ends in a domain that scripts/preflight-airgap.sh refuses to let into this
// repository, and rightly so: it is environment configuration, like the model
// gateway address. The caller supplies the full endpoint.
//
// Credential resolution, in order — this is what lets the same image run under
// IRSA on EKS and under a node instance profile with no configuration change:
//   1. AWS_WEB_IDENTITY_TOKEN_FILE + AWS_ROLE_ARN   (IRSA)
//   2. AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_SESSION_TOKEN
//   3. IMDSv2 instance profile
//
// NODE_EXTRA_CA_CERTS is honoured by Node itself, so the enclave's private CA
// — installed by deploy/enclave-ca.sh — covers these calls with no second
// mechanism.

const crypto = require('node:crypto');
const https = require('node:https');
const http = require('node:http');
const fs = require('node:fs');

const sha256 = (d) => crypto.createHash('sha256').update(d, 'utf8').digest('hex');
const hmac = (k, d) => crypto.createHmac('sha256', k).update(d, 'utf8').digest();

/**
 * One HTTP(S) round trip. Returns {status, body}; never throws on a non-2xx,
 * because the caller has better context for the error message than we do.
 */
function request(url, { method = 'GET', headers = {}, body = '', timeoutMs = 10000 } = {}) {
  const u = new URL(url);
  const lib = u.protocol === 'http:' ? http : https;
  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || undefined,
        path: `${u.pathname}${u.search}`,
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (c) => { data += c; });
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      },
    );
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`timed out after ${timeoutMs}ms`)));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// --- credentials -----------------------------------------------------------

/** Pull one XML element's text. STS returns XML; this is all the parsing we need. */
function xmlText(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return m ? m[1] : null;
}

async function fromWebIdentity({ region, stsEndpoint }) {
  const tokenFile = process.env.AWS_WEB_IDENTITY_TOKEN_FILE;
  const roleArn = process.env.AWS_ROLE_ARN;
  if (!tokenFile || !roleArn) return null;

  const token = fs.readFileSync(tokenFile, 'utf8').trim();
  const sessionName = process.env.AWS_ROLE_SESSION_NAME || 'imax-secrets-init';
  const endpoint = stsEndpoint || process.env.AWS_STS_ENDPOINT;
  if (!endpoint) {
    throw new Error(
      'IRSA is configured (AWS_WEB_IDENTITY_TOKEN_FILE + AWS_ROLE_ARN) but no STS '
      + 'endpoint is set. Set AWS_STS_ENDPOINT for this region.',
    );
  }

  const form = new URLSearchParams({
    Action: 'AssumeRoleWithWebIdentity',
    Version: '2011-06-15',
    RoleArn: roleArn,
    RoleSessionName: sessionName,
    WebIdentityToken: token,
  }).toString();

  const res = await request(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      'Content-Length': Buffer.byteLength(form),
    },
    body: form,
  });
  if (res.status !== 200) {
    // The STS error body names the trust-policy problem precisely, and that is
    // the single most useful string when IRSA is misconfigured.
    throw new Error(`AssumeRoleWithWebIdentity failed (HTTP ${res.status}): ${res.body.slice(0, 500)}`);
  }
  const creds = {
    accessKeyId: xmlText(res.body, 'AccessKeyId'),
    secretAccessKey: xmlText(res.body, 'SecretAccessKey'),
    sessionToken: xmlText(res.body, 'SessionToken'),
    source: 'irsa',
  };
  if (!creds.accessKeyId || !creds.secretAccessKey) {
    throw new Error('AssumeRoleWithWebIdentity returned no credentials');
  }
  void region;
  return creds;
}

function fromEnvironment() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) return null;
  return {
    accessKeyId,
    secretAccessKey,
    sessionToken: process.env.AWS_SESSION_TOKEN || null,
    source: 'environment',
  };
}

async function fromInstanceMetadata() {
  // IMDSv2 only. v1 is disabled on any sensibly configured account, and
  // falling back to it would paper over a misconfiguration we would rather see.
  const base = process.env.AWS_EC2_METADATA_SERVICE_ENDPOINT || 'http://169.254.169.254';
  const tok = await request(`${base}/latest/api/token`, {
    method: 'PUT',
    headers: { 'x-aws-ec2-metadata-token-ttl-seconds': '60' },
    timeoutMs: 2000,
  });
  if (tok.status !== 200) return null;
  const h = { 'x-aws-ec2-metadata-token': tok.body };

  const role = await request(`${base}/latest/meta-data/iam/security-credentials/`,
    { headers: h, timeoutMs: 2000 });
  if (role.status !== 200 || !role.body.trim()) return null;

  const cred = await request(
    `${base}/latest/meta-data/iam/security-credentials/${role.body.trim().split('\n')[0]}`,
    { headers: h, timeoutMs: 2000 },
  );
  if (cred.status !== 200) return null;

  const parsed = JSON.parse(cred.body);
  return {
    accessKeyId: parsed.AccessKeyId,
    secretAccessKey: parsed.SecretAccessKey,
    sessionToken: parsed.Token || null,
    source: 'instance-profile',
  };
}

/** Walk the chain. Throws with all three failures named, not just the last. */
async function resolveCredentials({ region, stsEndpoint } = {}) {
  const irsa = await fromWebIdentity({ region, stsEndpoint });
  if (irsa) return irsa;

  const env = fromEnvironment();
  if (env) return env;

  try {
    const imds = await fromInstanceMetadata();
    if (imds) return imds;
  } catch {
    // Unreachable IMDS is the normal case off EC2; it is not the error worth
    // reporting, the exhausted chain is.
  }

  throw new Error(
    'no AWS credentials: tried IRSA (AWS_WEB_IDENTITY_TOKEN_FILE + AWS_ROLE_ARN), '
    + 'environment (AWS_ACCESS_KEY_ID), and the IMDSv2 instance profile',
  );
}

// --- signing ---------------------------------------------------------------

/**
 * Sign and send one request. `endpoint` is the full base URL of the service in
 * the target region — supplied by configuration, never derived here.
 */
async function signedRequest({
  endpoint, region, service, target, body, credentials, timeoutMs = 10000,
}) {
  const u = new URL(endpoint);
  const host = u.host;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256(body);

  const headers = {
    'content-type': 'application/x-amz-json-1.1',
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    'x-amz-target': target,
  };
  if (credentials.sessionToken) headers['x-amz-security-token'] = credentials.sessionToken;

  const signedHeaders = Object.keys(headers).sort().join(';');
  const canonicalHeaders = Object.keys(headers).sort()
    .map((k) => `${k}:${String(headers[k]).trim()}\n`).join('');

  const canonicalRequest = [
    'POST',
    u.pathname || '/',
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    sha256(canonicalRequest),
  ].join('\n');

  const kDate = hmac(`AWS4${credentials.secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

  headers.authorization = `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${scope}, `
    + `SignedHeaders=${signedHeaders}, Signature=${signature}`;
  headers['content-length'] = Buffer.byteLength(body);

  return request(endpoint, { method: 'POST', headers, body, timeoutMs });
}

/**
 * secretsmanager:GetSecretValue. Returns the raw API result so the caller can
 * decide how to interpret SecretString vs SecretBinary.
 */
async function getSecretValue({ endpoint, region, secretId, credentials, timeoutMs }) {
  const res = await signedRequest({
    endpoint,
    region,
    service: 'secretsmanager',
    target: 'secretsmanager.GetSecretValue',
    body: JSON.stringify({ SecretId: secretId }),
    credentials,
    timeoutMs,
  });

  if (res.status !== 200) {
    let type = '';
    try { type = JSON.parse(res.body).__type || ''; } catch { /* body is not JSON */ }
    // The secret NAME is safe to print and is the fact that resolves this;
    // the body never contains secret material on an error path.
    throw new Error(
      `GetSecretValue "${secretId}" failed (HTTP ${res.status}${type ? ` ${type}` : ''}): `
      + res.body.slice(0, 300),
    );
  }
  return JSON.parse(res.body);
}

module.exports = {
  resolveCredentials, signedRequest, getSecretValue, request,
  // Exported for the unit tests, which check the canonical request and the
  // derived signature against AWS's published test vectors.
  _internals: { sha256, hmac },
};
