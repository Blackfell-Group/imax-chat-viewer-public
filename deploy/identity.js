// Caller identity from proxy-injected request headers.
//
// The enclave front (OIDC / mTLS) authenticates the user and forwards identity
// as headers. Header NAMES vary by deployment, so every one is configurable and
// nothing here hardcodes a site's convention — the defaults are OpenLake's
// (x-ain, x-name, x-ismemberof, x-org) because that is the first target, not
// because they are special.
//
//   AUTH_MODE            proxy-header | bearer-jwt | disabled  (default: disabled)
//   AUTH_HEADER_ID       default: x-ain
//   AUTH_HEADER_NAME     default: x-name
//   AUTH_HEADER_GROUPS   default: x-ismemberof
//   AUTH_HEADER_ORG      default: x-org
//   AUTH_GROUP_SEPARATOR default: ",;" (any of these characters splits)
//   AUTH_REQUIRED_GROUPS optional, comma-separated; caller must hold ANY one
//
// bearer-jwt mode, for fronts that forward tokens rather than flat headers:
//   AUTH_HEADER_TOKEN    default: authorization  ("Bearer <token>" tolerated)
//   AUTH_HEADER_ACCESS_TOKEN default: x-auth-request-access-token
//   AUTH_CLAIM_ID        default: sub
//   AUTH_CLAIM_NAME      default: name
//   AUTH_CLAIM_GROUPS    default: groups
//   AUTH_CLAIM_ORG       default: org
//
// the target environment's front is oauth2-proxy in front of the STS, which sends the
// identity token in `Authorization` and the access token in
// `x-auth-request-access-token`. Claim names are configuration for the same
// reason header names are: we do not know what a given STS emits, and being
// wrong should cost a ConfigMap edit rather than a rebuild.
//
// SECURITY — READ THIS BEFORE DEPLOYING.
// Headers are trusted absolutely, and in bearer-jwt mode the token's SIGNATURE
// IS NOT VERIFIED — it is decoded. That is correct only when the pod cannot be
// reached except through the authenticating front, because anyone who can talk
// to it directly can assert any identity by setting a header or by pasting an
// unsigned token. The front has already validated the token before forwarding
// it; re-verifying here would defend against an attacker who, by construction,
// has already bypassed the only control that matters. The NetworkPolicy
// restricts the enrichment pods; restricting ingress to THIS pod so that only
// the front can reach it is a target environment-side control we cannot express here,
// and it is what makes both enforcing modes safe. See AIRGAP.md §9.

const MODE = (process.env.AUTH_MODE || 'disabled').toLowerCase();

const H = {
  id: (process.env.AUTH_HEADER_ID || 'x-ain').toLowerCase(),
  name: (process.env.AUTH_HEADER_NAME || 'x-name').toLowerCase(),
  groups: (process.env.AUTH_HEADER_GROUPS || 'x-ismemberof').toLowerCase(),
  org: (process.env.AUTH_HEADER_ORG || 'x-org').toLowerCase(),
  token: (process.env.AUTH_HEADER_TOKEN || 'authorization').toLowerCase(),
  accessToken: (process.env.AUTH_HEADER_ACCESS_TOKEN || 'x-auth-request-access-token').toLowerCase(),
};

const C = {
  id: process.env.AUTH_CLAIM_ID || 'sub',
  name: process.env.AUTH_CLAIM_NAME || 'name',
  groups: process.env.AUTH_CLAIM_GROUPS || 'groups',
  org: process.env.AUTH_CLAIM_ORG || 'org',
};

const SEPARATORS = process.env.AUTH_GROUP_SEPARATOR || ',;';
const REQUIRED = (process.env.AUTH_REQUIRED_GROUPS || '')
  .split(',')
  .map((g) => g.trim())
  .filter(Boolean);

function splitGroups(raw) {
  if (!raw) return [];
  const pattern = new RegExp(`[${SEPARATORS.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')}]`);
  return raw.split(pattern).map((g) => g.trim()).filter(Boolean);
}

/**
 * Decode a JWT payload. NO SIGNATURE VERIFICATION — see the security note at
 * the top of this file. Returns null for anything that is not a readable JWT,
 * so a garbage token is treated as no identity rather than throwing into the
 * request path.
 */
function decodeClaims(raw) {
  if (!raw) return null;
  // Tolerate both "Bearer <token>" and a bare token: oauth2-proxy sends the
  // former in Authorization, but a header configured to carry only the token
  // is just as plausible and the distinction is not worth a support call.
  const token = raw.replace(/^Bearer\s+/i, '').trim();
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

/** Identity from flat proxy headers — the original path, unchanged. */
function parseHeaders(headers) {
  // Multiple values for one header means something upstream is appending —
  // ambiguous identity is no identity.
  const one = (h) => (Array.isArray(headers[h]) ? undefined : headers[h]);

  const id = (one(H.id) || '').trim();
  if (!id) return null;

  const groups = splitGroups(one(H.groups));
  return {
    id,
    name: (one(H.name) || '').trim() || id,
    org: (one(H.org) || '').trim() || null,
    groups,
    // Whoever the officer is, this is the string that lands in the gold copy.
    label: (one(H.name) || '').trim() || id,
  };
}

/** Identity from the STS identity token's claims. Same shape out. */
function parseToken(headers) {
  const one = (h) => (Array.isArray(headers[h]) ? undefined : headers[h]);

  const claims = decodeClaims(one(H.token));
  if (!claims) return null;

  const id = String(claims[C.id] ?? '').trim();
  if (!id) return null;

  // Groups arrive as a JSON array from most OIDC providers and as a delimited
  // string from some. Accept both rather than making the deployment guess.
  const rawGroups = claims[C.groups];
  const groups = Array.isArray(rawGroups)
    ? rawGroups.map((g) => String(g).trim()).filter(Boolean)
    : splitGroups(rawGroups == null ? '' : String(rawGroups));

  const name = String(claims[C.name] ?? '').trim();
  const org = String(claims[C.org] ?? '').trim();
  return {
    id,
    name: name || id,
    org: org || null,
    groups,
    label: name || id,
    // Names only — never values. This is what makes "right claims, wrong
    // configured names" a one-request diagnosis against the real front
    // instead of a guess. See describe().
    claimNames: Object.keys(claims).sort(),
  };
}

/** Parse identity from headers. Returns null when no identity was asserted. */
function parse(headers) {
  return MODE === 'bearer-jwt' ? parseToken(headers) : parseHeaders(headers);
}

function authorized(identity) {
  if (!REQUIRED.length) return true;
  if (!identity) return false;
  return identity.groups.some((g) => REQUIRED.includes(g));
}

/**
 * Express middleware. Populates req.identity, and in proxy-header mode refuses
 * requests that carry no identity (401) or the wrong groups (403).
 *
 * In `disabled` mode headers are still parsed when present — so a developer or
 * a test can see the plumbing work — but nothing is enforced.
 */
function middleware() {
  return (req, res, next) => {
    req.identity = parse(req.headers);
    // The caller's STS access token, captured but deliberately unused: the
    // model gateway authenticates with its own MODEL_API_KEY, not as the end
    // user. Here so the plumbing exists if that ever changes. Never logged,
    // never forwarded.
    if (MODE === 'bearer-jwt') {
      const t = req.headers[H.accessToken];
      req.accessToken = Array.isArray(t) ? undefined : t;
    }

    if (MODE !== 'proxy-header' && MODE !== 'bearer-jwt') return next();

    if (!req.identity) {
      // "No token" and "a token I could not read" are different deployment
      // mistakes — a missing oauth2-proxy flag versus a wrong claim name — and
      // sending the same message for both costs an afternoon.
      const detail = MODE === 'bearer-jwt'
        ? (decodeClaims(req.headers[H.token])
          ? `token carried no "${C.id}" claim — check AUTH_CLAIM_ID against /api/whoami`
          : `expected the authenticating proxy to set "${H.token}" to a JWT`)
        : `expected the authenticating proxy to set "${H.id}"`;
      return res.status(401).json({ error: 'no identity asserted', detail });
    }
    if (!authorized(req.identity)) {
      return res.status(403).json({
        error: 'not authorized',
        detail: `requires membership of one of: ${REQUIRED.join(', ')}`,
      });
    }
    return next();
  };
}

/** What /api/whoami returns; also what the SPA renders in the toolbar. */
function describe(identity) {
  const out = {
    mode: MODE,
    authenticated: !!identity,
    id: identity?.id ?? null,
    name: identity?.name ?? null,
    org: identity?.org ?? null,
    groups: identity?.groups ?? [],
    label: identity?.label ?? null,
    // Echo the configured names so a misconfigured front is diagnosable from
    // the response instead of by reading pod env.
    headers: H,
    requiredGroups: REQUIRED,
  };
  if (MODE === 'bearer-jwt') {
    out.claims = C;
    // The claim names the token actually carried, so "right claims, wrong
    // configured names" is visible side by side with `claims` above. NAMES
    // ONLY — a claim value could be the caller's identity or an entitlement,
    // and this endpoint is not a token dump.
    out.claimNamesPresent = identity?.claimNames ?? [];
    out.signatureVerified = false;
  }
  return out;
}

/** One line for the startup log, so the trust posture is visible in kubectl logs. */
function describeMode() {
  const gate = REQUIRED.length ? `, requires group: ${REQUIRED.join('|')}` : '';
  if (MODE === 'bearer-jwt') {
    // The unverified-signature note is in the startup log rather than only in
    // a source comment on purpose: it is a deployment-time assumption about
    // the front, and whoever is reading pod logs is the person who can check it.
    return `auth mode: bearer-jwt (token header "${H.token}", id claim "${C.id}"${gate}) ` +
      '— signature NOT verified; the front is trusted, see AIRGAP.md §9';
  }
  if (MODE === 'proxy-header') {
    return `auth mode: proxy-header (id header "${H.id}"${gate})`;
  }
  return `auth mode: ${MODE} — headers parsed but not enforced`;
}

module.exports = {
  parse, authorized, middleware, describe, describeMode, decodeClaims,
  MODE, HEADERS: H, CLAIMS: C, REQUIRED,
};
