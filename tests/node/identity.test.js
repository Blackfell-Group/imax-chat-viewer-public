// Identity header resolution — deploy/identity.js.
//
// Run: npm run test:node   (node --test, no extra dependency)
//
// Tested here rather than only through the cluster smoke because the enforcing
// paths — 401 with no identity, 403 with the wrong groups — are exactly the
// ones a deployment never exercises until a real user is refused. And because
// the header names are configuration, "swappable" has to be proven rather than
// asserted.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const MODULE = path.join(__dirname, '..', '..', 'deploy', 'identity.js');
const KEYS = [
  'AUTH_MODE', 'AUTH_HEADER_ID', 'AUTH_HEADER_NAME', 'AUTH_HEADER_GROUPS',
  'AUTH_HEADER_ORG', 'AUTH_GROUP_SEPARATOR', 'AUTH_REQUIRED_GROUPS',
  'AUTH_HEADER_TOKEN', 'AUTH_HEADER_ACCESS_TOKEN',
  'AUTH_CLAIM_ID', 'AUTH_CLAIM_NAME', 'AUTH_CLAIM_GROUPS', 'AUTH_CLAIM_ORG',
];

/**
 * Build an UNSIGNED JWT. Unsigned on purpose: bearer-jwt mode decodes without
 * verifying, so a test that signed its fixtures would prove something the
 * production path does not do. See the security note in deploy/identity.js.
 */
function jwt(claims) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64(claims)}.`;
}

/** Load identity.js fresh under a given environment — it reads env at import. */
function loadWith(env) {
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, env);
  delete require.cache[require.resolve(MODULE)];
  return require(MODULE);
}

/** Drive the middleware and report what it did. */
function run(mw, headers) {
  const res = {
    code: 0,
    body: null,
    status(c) { this.code = c; return this; },
    json(b) { this.body = b; return this; },
  };
  const req = { headers };
  let nexted = false;
  mw(req, res, () => { nexted = true; });
  return { req, res, nexted };
}

test('reads the OpenLake default header names', () => {
  const id = loadWith({});
  const who = id.parse({
    'x-ain': 'a1234567',
    'x-name': 'R. Vance',
    'x-ismemberof': 'IMAX-LINGUIST;ENRICH-ALL',
    'x-org': 'ANALYSIS/OPS',
  });
  assert.equal(who.id, 'a1234567');
  assert.equal(who.name, 'R. Vance');
  assert.equal(who.org, 'ANALYSIS/OPS');
  assert.equal(who.label, 'R. Vance');
  assert.deepEqual(who.groups, ['IMAX-LINGUIST', 'ENRICH-ALL']);
});

test('swapped header names need no code change', () => {
  const id = loadWith({
    AUTH_HEADER_ID: 'x-remote-user',
    AUTH_HEADER_NAME: 'x-display-name',
    AUTH_HEADER_GROUPS: 'x-remote-groups',
    AUTH_HEADER_ORG: 'x-company',
  });
  const who = id.parse({
    'x-remote-user': 'jdoe',
    'x-display-name': 'J. Doe',
    'x-remote-groups': 'analysts,linguists',
    'x-company': 'Acme',
    'x-ain': 'MUST-BE-IGNORED',
  });
  assert.equal(who.id, 'jdoe');
  assert.deepEqual(who.groups, ['analysts', 'linguists']);
});

test('display name falls back to the id', () => {
  const id = loadWith({});
  assert.equal(id.parse({ 'x-ain': 'a1234567' }).label, 'a1234567');
});

test('a missing or blank id is no identity', () => {
  const id = loadWith({});
  assert.equal(id.parse({}), null);
  assert.equal(id.parse({ 'x-ain': '   ' }), null);
});

test('a duplicated identity header is ambiguous, so no identity', () => {
  const id = loadWith({});
  // An array means something upstream appended a second value. If we cannot
  // tell which caller is being asserted, there is no caller.
  assert.equal(id.parse({ 'x-ain': ['a1234567', 'attacker'] }), null);
});

test('groups split on either configured separator', () => {
  const id = loadWith({});
  assert.deepEqual(id.parse({ 'x-ain': 'u', 'x-ismemberof': 'a;b,c ; d' }).groups,
    ['a', 'b', 'c', 'd']);
});

test('a custom separator is honoured', () => {
  const id = loadWith({ AUTH_GROUP_SEPARATOR: '|' });
  assert.deepEqual(id.parse({ 'x-ain': 'u', 'x-ismemberof': 'a|b' }).groups, ['a', 'b']);
});

test('no required group means anyone authenticated passes', () => {
  const id = loadWith({});
  assert.equal(id.authorized(id.parse({ 'x-ain': 'u' })), true);
});

test('holding any one required group passes', () => {
  const id = loadWith({ AUTH_REQUIRED_GROUPS: 'IMAX-LINGUIST,IMAX-ADMIN' });
  assert.equal(id.authorized(id.parse({ 'x-ain': 'u', 'x-ismemberof': 'ENRICH-ALL;IMAX-ADMIN' })), true);
});

test('holding none of them fails', () => {
  const id = loadWith({ AUTH_REQUIRED_GROUPS: 'IMAX-LINGUIST' });
  assert.equal(id.authorized(id.parse({ 'x-ain': 'u', 'x-ismemberof': 'ENRICH-ALL' })), false);
});

test('an unauthenticated caller fails a group requirement', () => {
  const id = loadWith({ AUTH_REQUIRED_GROUPS: 'IMAX-LINGUIST' });
  assert.equal(id.authorized(null), false);
});

test('disabled mode parses identity but enforces nothing', () => {
  const id = loadWith({ AUTH_MODE: 'disabled' });
  const { req, nexted } = run(id.middleware(), { 'x-ain': 'a1' });
  assert.equal(nexted, true);
  assert.equal(req.identity.id, 'a1');
});

test('disabled mode admits a request with no identity at all', () => {
  const id = loadWith({ AUTH_MODE: 'disabled' });
  const { req, nexted } = run(id.middleware(), {});
  assert.equal(nexted, true);
  assert.equal(req.identity, null);
});

test('proxy-header mode 401s with no identity', () => {
  const id = loadWith({ AUTH_MODE: 'proxy-header' });
  const { res, nexted } = run(id.middleware(), {});
  assert.equal(res.code, 401);
  assert.equal(nexted, false);
  // The refusal names the header it wanted, so a misconfigured front is
  // diagnosable from the response instead of by reading pod env.
  assert.match(res.body.detail, /x-ain/);
});

test('proxy-header mode 403s with the wrong groups', () => {
  const id = loadWith({ AUTH_MODE: 'proxy-header', AUTH_REQUIRED_GROUPS: 'IMAX-LINGUIST' });
  const { res, nexted } = run(id.middleware(), { 'x-ain': 'u', 'x-ismemberof': 'OTHER' });
  assert.equal(res.code, 403);
  assert.equal(nexted, false);
});

test('proxy-header mode admits an authorized caller', () => {
  const id = loadWith({ AUTH_MODE: 'proxy-header', AUTH_REQUIRED_GROUPS: 'IMAX-LINGUIST' });
  const { nexted } = run(id.middleware(), { 'x-ain': 'u', 'x-ismemberof': 'IMAX-LINGUIST' });
  assert.equal(nexted, true);
});

test('describe() echoes the configured names for diagnosis', () => {
  const id = loadWith({ AUTH_MODE: 'proxy-header', AUTH_HEADER_ID: 'x-remote-user' });
  const d = id.describe(null);
  assert.equal(d.authenticated, false);
  assert.equal(d.mode, 'proxy-header');
  assert.equal(d.headers.id, 'x-remote-user');
});

// ---------------------------------------------------------------------------
// bearer-jwt mode — the target environment's front (oauth2-proxy in front of the STS) sends
// tokens, not flat headers. Same identity shape out, so everything downstream
// is unaware of which front it is behind.
// ---------------------------------------------------------------------------

test('an STS identity token resolves to the same shape as proxy headers', () => {
  const id = loadWith({ AUTH_MODE: 'bearer-jwt' });
  const who = id.parse({
    authorization: `Bearer ${jwt({
      sub: 'a1234567',
      name: 'R. Vance',
      groups: ['IMAX-LINGUIST', 'ENRICH-ALL'],
      org: 'ANALYSIS/OPS',
    })}`,
  });
  assert.equal(who.id, 'a1234567');
  assert.equal(who.name, 'R. Vance');
  assert.equal(who.org, 'ANALYSIS/OPS');
  assert.equal(who.label, 'R. Vance');
  assert.deepEqual(who.groups, ['IMAX-LINGUIST', 'ENRICH-ALL']);
});

test('a bare token without the Bearer prefix is accepted', () => {
  const id = loadWith({ AUTH_MODE: 'bearer-jwt' });
  assert.equal(id.parse({ authorization: jwt({ sub: 'u' }) }).id, 'u');
});

test('groups as a delimited string split like the header form', () => {
  const id = loadWith({ AUTH_MODE: 'bearer-jwt' });
  const who = id.parse({ authorization: jwt({ sub: 'u', groups: 'a;b,c ; d' }) });
  assert.deepEqual(who.groups, ['a', 'b', 'c', 'd']);
});

test('a missing groups claim is no groups, not a crash', () => {
  const id = loadWith({ AUTH_MODE: 'bearer-jwt' });
  assert.deepEqual(id.parse({ authorization: jwt({ sub: 'u' }) }).groups, []);
});

test('claim names are configurable without a code change', () => {
  const id = loadWith({
    AUTH_MODE: 'bearer-jwt',
    AUTH_CLAIM_ID: 'preferred_username',
    AUTH_CLAIM_NAME: 'displayName',
    AUTH_CLAIM_GROUPS: 'memberOf',
    AUTH_CLAIM_ORG: 'organization',
  });
  const who = id.parse({
    authorization: jwt({
      preferred_username: 'jdoe',
      displayName: 'J. Doe',
      memberOf: ['analysts'],
      organization: 'Acme',
      sub: 'MUST-BE-IGNORED',
    }),
  });
  assert.equal(who.id, 'jdoe');
  assert.equal(who.org, 'Acme');
  assert.deepEqual(who.groups, ['analysts']);
});

test('a non-default token header is honoured', () => {
  const id = loadWith({ AUTH_MODE: 'bearer-jwt', AUTH_HEADER_TOKEN: 'x-id-token' });
  assert.equal(id.parse({ 'x-id-token': jwt({ sub: 'u' }) }).id, 'u');
  assert.equal(id.parse({ authorization: jwt({ sub: 'u' }) }), null);
});

test('absent, malformed and non-JWT tokens are all no identity', () => {
  const id = loadWith({ AUTH_MODE: 'bearer-jwt' });
  assert.equal(id.parse({}), null);
  assert.equal(id.parse({ authorization: 'Bearer not-a-jwt' }), null);
  assert.equal(id.parse({ authorization: 'Bearer a.b' }), null);
  // Three segments, but the payload is not base64url JSON.
  assert.equal(id.parse({ authorization: 'Bearer a.!!!.c' }), null);
  // Valid JWT carrying no id claim.
  assert.equal(id.parse({ authorization: jwt({ name: 'no sub' }) }), null);
});

test('a duplicated token header is ambiguous, so no identity', () => {
  const id = loadWith({ AUTH_MODE: 'bearer-jwt' });
  assert.equal(id.parse({ authorization: [jwt({ sub: 'u' }), jwt({ sub: 'attacker' })] }), null);
});

test('bearer-jwt 401 distinguishes "no token" from "unreadable claims"', () => {
  const id = loadWith({ AUTH_MODE: 'bearer-jwt' });

  // No token at all — name the header the front should have set.
  const missing = run(id.middleware(), {});
  assert.equal(missing.res.code, 401);
  assert.match(missing.res.body.detail, /authorization/);

  // A perfectly good token whose id claim is spelled differently. This is the
  // likeliest real failure, and it must not read as "the front sent nothing".
  const wrongClaim = run(id.middleware(), { authorization: jwt({ upn: 'u' }) });
  assert.equal(wrongClaim.res.code, 401);
  assert.match(wrongClaim.res.body.detail, /AUTH_CLAIM_ID/);
});

test('bearer-jwt enforces required groups from claims', () => {
  const id = loadWith({ AUTH_MODE: 'bearer-jwt', AUTH_REQUIRED_GROUPS: 'IMAX-LINGUIST' });
  assert.equal(run(id.middleware(), {
    authorization: jwt({ sub: 'u', groups: ['ENRICH-ALL'] }),
  }).res.code, 403);
  assert.equal(run(id.middleware(), {
    authorization: jwt({ sub: 'u', groups: ['IMAX-LINGUIST'] }),
  }).nexted, true);
});

test('the access token is attached to the request but never used', () => {
  const id = loadWith({ AUTH_MODE: 'bearer-jwt' });
  const { req } = run(id.middleware(), {
    authorization: jwt({ sub: 'u' }),
    'x-auth-request-access-token': 'opaque-access-token',
  });
  assert.equal(req.accessToken, 'opaque-access-token');
});

test('whoami reports claim NAMES present, never claim values', () => {
  const id = loadWith({ AUTH_MODE: 'bearer-jwt' });
  const who = id.parse({
    authorization: jwt({ sub: 'a1234567', upn: 'secret@example.gov', groups: ['G'] }),
  });
  const d = id.describe(who);
  assert.equal(d.signatureVerified, false);
  assert.equal(d.claims.id, 'sub');
  assert.deepEqual(d.claimNamesPresent, ['groups', 'sub', 'upn']);
  // The whole point: a name is diagnostic, a value is a disclosure.
  assert.equal(JSON.stringify(d).includes('secret@example.gov'), false);
});

test('the startup line states the unverified-signature posture', () => {
  assert.match(loadWith({ AUTH_MODE: 'bearer-jwt' }).describeMode(),
    /bearer-jwt.*signature NOT verified/);
  assert.match(loadWith({ AUTH_MODE: 'proxy-header' }).describeMode(),
    /proxy-header \(id header "x-ain"\)/);
  assert.match(loadWith({}).describeMode(), /not enforced/);
});

test('proxy-header mode ignores a token, and bearer-jwt ignores flat headers', () => {
  // The two modes must not partially fall back to each other: a half-configured
  // front should fail closed, not authenticate off whichever half it got right.
  const asHeaders = loadWith({ AUTH_MODE: 'proxy-header' });
  assert.equal(asHeaders.parse({ authorization: jwt({ sub: 'u' }) }), null);

  const asToken = loadWith({ AUTH_MODE: 'bearer-jwt' });
  assert.equal(asToken.parse({ 'x-ain': 'a1234567' }), null);
});
