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
  # `|| true`: under `set -euo pipefail` a missing directory fails the pipeline
  # and kills the script with no message — which is what a FAILED BUILD looks
  # like here, since it leaves $DIST present but empty. Report that, do not
  # vanish on it.
  fonts=$(ls "$DIST/fonts" 2>/dev/null | wc -l | tr -d ' ' || true)
  fonts=${fonts:-0}
  if [[ "$fonts" -lt 2 ]]; then
    echo "FAIL: $DIST/fonts has $fonts file(s); expected the vendored woff2 set." >&2
    echo "      (an empty $DIST usually means the production build failed — run it and read the error)" >&2
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

# The release tag the package POINTS AT, in every place that points at one.
#
# deploy/argocd/application.yaml is the manifest the Government applies. It pins
# targetRevision to a tag rather than tracking main, deliberately — but that pin
# had been left at v1.2.0-prototype while the package moved six tags past it, so
# a sync would have deployed a build without the fixes the package documents.
# A stale pin here is worse than a stale sentence in a document: it is wrong
# software, installed on purpose.
echo "==> release tag references agree"
argocd_tag=$(sed -n 's/.*targetRevision: \(v[0-9.]*-prototype\).*/\1/p' deploy/argocd/application.yaml | head -1)
delivery_tag=$(sed -n 's/.*Release tag: \*\*`\(v[0-9.]*-prototype\)`\*\*.*/\1/p' DELIVERY.md | head -1)
# `|| true` is load-bearing under `set -euo pipefail`: CI checks out shallow and
# WITHOUT tags, so grep matches nothing, the pipeline fails, and the script exits
# 1 having printed only its header — a guard failing for a reason that has
# nothing to do with what it guards. No tags simply means the newest-tag
# comparison cannot be made here; the two declarations are still checked.
newest_tag=$(git tag --sort=-v:refname 2>/dev/null | grep -E '^v[0-9.]+-prototype$' | head -1 || true)
tag_bad=0
if [ -n "$argocd_tag" ] && [ -n "$delivery_tag" ] && [ "$argocd_tag" != "$delivery_tag" ]; then
  echo "  FAIL: ArgoCD pins $argocd_tag but DELIVERY.md names $delivery_tag" >&2
  tag_bad=1
fi
# Declared newer than the newest tag is fine — that is the release about to be cut.
# Declared OLDER means the documents and the deployment are behind the code.
if [ -n "$newest_tag" ] && [ -n "$argocd_tag" ] && [ "$argocd_tag" != "$newest_tag" ]; then
  older=$(printf '%s\n%s\n' "$argocd_tag" "$newest_tag" | sort -V | head -1)
  if [ "$older" = "$argocd_tag" ]; then
    echo "  FAIL: package points at $argocd_tag but $newest_tag exists — deployment would be behind" >&2
    tag_bad=1
  fi
fi
if [ "$tag_bad" -ne 0 ]; then
  echo "  update deploy/argocd/application.yaml and DELIVERY.md to the release being shipped" >&2
  exit 1
fi
if [ -n "$newest_tag" ]; then
  echo "  $argocd_tag, consistent across the manifest and the delivery note"
else
  echo "  $argocd_tag, consistent across the manifest and the delivery note (no tags fetched — not compared against the repository's newest)"
fi

echo "air-gap preflight: PASS"
exit $status
