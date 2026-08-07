#!/bin/bash
# Air-gap preflight: fail if anything in the shipped SPA reaches for the
# public internet at runtime.
#
#   ./scripts/preflight-airgap.sh [dist-dir]
#
# This exists because the failure it guards against is silent. When the app
# loaded Roboto and Material Icons from fonts.googleapis.com, everything looked
# correct in CI and in the recorded demo — both run with egress — and would have
# rendered all 32 icons as literal ligature text ("delete_outline") the first
# time anyone opened it inside the enclave. Nothing failed; it just looked
# broken. A grep in CI is the cheapest possible insurance.
set -euo pipefail
cd "$(dirname "$0")/.."

DIST="${1:-angular/dist/imax-chat-viewer-ng/browser}"
status=0

# Hosts that are inert: XML namespaces (never fetched) and documentation links
# baked into framework error messages.
ALLOW='w3\.org|angular\.dev|schemas\.|example\.com|localhost|127\.0\.0\.1'

echo "==> source: angular/src"
if hits=$(grep -rInE 'https?://[a-zA-Z0-9.-]+' angular/src \
            --include='*.html' --include='*.ts' --include='*.scss' --include='*.css' \
          | grep -vE "$ALLOW" || true); [[ -n "$hits" ]]; then
  echo "$hits"
  echo "FAIL: external URL in SPA source. Vendor the asset (see scripts/vendor-fonts.js)." >&2
  status=1
else
  echo "  clean"
fi

if [[ -d "$DIST" ]]; then
  echo "==> built bundle: $DIST"
  if hits=$(grep -rhoE 'https?://[a-zA-Z0-9.-]+' "$DIST" 2>/dev/null \
            | grep -vE "$ALLOW" | sort -u || true); [[ -n "$hits" ]]; then
    echo "$hits"
    echo "FAIL: external URL in the built bundle." >&2
    status=1
  else
    echo "  clean"
  fi

  echo "==> vendored fonts present"
  fonts=$(ls "$DIST/fonts" 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$fonts" -lt 2 ]]; then
    echo "FAIL: $DIST/fonts has $fonts file(s); expected the vendored woff2 set." >&2
    status=1
  else
    echo "  $fonts font files shipped"
  fi
else
  echo "==> built bundle: not found at $DIST (skipped; run npm run build --prefix angular)"
fi

# Every local module an entrypoint requires must actually be COPYed into the
# image. Getting this wrong produces a crash-looping pod with MODULE_NOT_FOUND
# and a green build — it has cost us a CI cycle twice (providers/, tls.js), so
# it is checked rather than remembered.
echo "==> entrypoint requires are present in the images"
check_requires() {
  local entry="$1" dockerfile="$2" missing="" self
  self="$(basename "$entry")"
  # The entrypoint itself has to be in the image before its dependencies
  # matter. secrets-init.js is the case that made this worth checking: it is
  # not the CMD of either image, so nothing else would notice its absence
  # until an initContainer failed in the enclave.
  if ! grep -qE "COPY .*deploy/${self}" "$dockerfile"; then
    echo "FAIL: ${self} is not COPYed in $(basename "$dockerfile")" >&2
    return 1
  fi
  # Local requires only: ./name or ./name.js, not node: or bare package names.
  for dep in $(grep -oE "require\('\./[A-Za-z0-9_-]+'\)" "$entry" \
               | sed "s|require('\./||;s|')||" | sort -u); do
    if ! grep -qE "COPY .*deploy/${dep}\.js|COPY .*\b${dep}\b" "$dockerfile"; then
      missing="${missing} ${dep}"
    fi
  done
  if [[ -n "$missing" ]]; then
    echo "FAIL: ${self} requires${missing} — not COPYed in $(basename "$dockerfile")" >&2
    return 1
  fi
  echo "  ${self} → $(basename "$dockerfile") ok"
}
check_requires deploy/spa-entry.js  deploy/Dockerfile.spa  || status=1
check_requires deploy/mock-entry.js deploy/Dockerfile.mock || status=1
# Runs as an initContainer from BOTH images, so it has to be in both.
check_requires deploy/secrets-init.js deploy/Dockerfile.spa  || status=1
check_requires deploy/secrets-init.js deploy/Dockerfile.mock || status=1

# The enclave gateway address must never enter the repository — it is
# configuration, supplied at deploy time through the Secret.
echo "==> no enclave hostnames committed"
if hits=$(grep -rInE '[a-z0-9.-]+\.(ic\.gov|cia)\b' \
            --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist \
            --exclude='preflight-airgap.sh' . 2>/dev/null || true); [[ -n "$hits" ]]; then
  echo "$hits"
  echo "FAIL: enclave hostname committed. It belongs in the Secret, not the repo." >&2
  status=1
else
  echo "  clean"
fi

[[ $status -eq 0 ]] && 
# --- guides in step with each other ----------------------------------------
# The guides ship in two formats and drifted once already: the Markdown was
# updated for a build change and the HTML was not, leaving two delivered
# documents that disagreed about how the product works. TDD 6.1 requires them
# to be written against the DELIVERED build, so a stale copy is a defect, not
# untidiness. Compares committed timestamps, not mtimes, which a fresh clone
# would otherwise fail on.
echo "==> user and developer guides agree across formats"
guides_stale=0
for base in user_guide developer_guide; do
  md="docs/$base.md"; htm="docs/$base.html"
  [ -f "$md" ] && [ -f "$htm" ] || continue
  md_at=$(git log -1 --format=%ct -- "$md" 2>/dev/null || echo 0)
  htm_at=$(git log -1 --format=%ct -- "$htm" 2>/dev/null || echo 0)
  if [ "$md_at" -gt "$htm_at" ] 2>/dev/null; then
    echo "  FAIL: $md was updated after $htm — the HTML guide is behind" >&2
    guides_stale=1
  fi
done
if [ "$guides_stale" -ne 0 ]; then
  echo "  update the HTML guide to match, or the package ships two documents that disagree" >&2
  exit 1
fi
echo "  both formats in step"

echo "air-gap preflight: PASS"
exit $status
