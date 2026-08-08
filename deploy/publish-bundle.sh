#!/bin/bash
# Publish the transfer bundle for download, and take it down again.
#
#   ./deploy/publish-bundle.sh [TAG] [--profile <aws profile>] [--remove]
#
# The package is too large to email. This puts it behind the existing
# CloudFront distribution so a recipient can fetch it with a URL and a curl,
# and — the half that actually matters — removes it again when the hand-off is
# done. Two files go up: the one DTO archive (built images, manifests, runbook
# and the complete source repository) and its sha256 sidecar.
#
# THE URL IS PUBLIC AND UNAUTHENTICATED. Anyone who has it can download, and
# there is no expiry — the takedown is manual, which is why --remove exists and
# why the publish output ends by reminding you of it. This is appropriate for a
# short hand-off of an UNCLASSIFIED package and for nothing else. The material
# is the same package that goes to the DTO; it carries no keys, no gateway
# address, and no enclave hostnames (scripts/preflight-airgap.sh enforces that
# last one on every build).
set -euo pipefail
cd "$(dirname "$0")/.."

TAG="0.1.0"
PROFILE=""
PREFIX="dl"
REMOVE=false
OUT="dist-bundle"

# Existing infrastructure — the marketing site's origin and distribution. A
# dedicated bucket would be tidier, but it would need a bucket, a distribution,
# an ACM certificate and a DNS record for something that is up for an afternoon.
BUCKET="openlake-site-blackfellgroup-com-759416136783"
DISTRIBUTION="E3GM3F9WARB4X"
SITE="https://blackfellgroup.com"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile) PROFILE="$2"; shift 2 ;;
    --prefix)  PREFIX="$2"; shift 2 ;;
    --remove)  REMOVE=true; shift ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    -*)        echo "unknown option: $1" >&2; exit 1 ;;
    *)         TAG="$1"; shift ;;
  esac
done

AWS=(aws)
[[ -n "$PROFILE" ]] && AWS+=(--profile "$PROFILE")

BUNDLE="imax-prototype-${TAG}.tar.gz"

# Three downloads, because three different people are asking for three
# different things:
#   (bare)      the DTO package — images, manifests, runbook and source in one
#               object, because a one-way transfer should be one object.
#   -src        the code alone, for reading, reviewing or rebuilding.
#   -artifacts  HCD work, guides, deck, board exports and the walkthroughs.
# Whichever of them exist in $OUT get published; the bare bundle is required
# and the other two are optional, so this still works when only the DTO
# package has been built.
ARCHIVES=("$BUNDLE" "imax-prototype-${TAG}-src.tar.gz" "imax-prototype-${TAG}-artifacts.tar.gz")
FILES=()
for a in "${ARCHIVES[@]}"; do
  if [[ -f "${OUT}/${a}" || "$a" == "$BUNDLE" ]]; then
    FILES+=("$a" "${a}.sha256")
  fi
done

invalidate() {
  echo "==> invalidating /${PREFIX}/*"
  "${AWS[@]}" cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION" --paths "/${PREFIX}/*" \
    --query 'Invalidation.Id' --output text
}

if $REMOVE; then
  # Takedown ignores what is on this disk: the machine doing the removing may
  # not be the one that published, and an archive left up because nobody had a
  # local copy of it is exactly the failure this flag exists to prevent.
  echo "==> removing s3://${BUCKET}/${PREFIX}/"
  for a in "${ARCHIVES[@]}"; do
    for f in "$a" "${a}.sha256"; do
      "${AWS[@]}" s3 rm "s3://${BUCKET}/${PREFIX}/${f}" 2>/dev/null && echo "  removed ${f}" || true
    done
  done
  invalidate
  echo
  echo "Taken down. Confirm (expect 404 for each):"
  for a in "${ARCHIVES[@]}"; do
    echo "  curl -sSI ${SITE}/${PREFIX}/${a} | head -1"
  done
  exit 0
fi

# Refuse to publish a partial set. A recipient who gets the bundle but not the
# checksum has no way to verify it, and one who gets a stale sidecar next to a
# fresh archive gets a mismatch that reads like corruption in transit.
missing=()
for f in "${FILES[@]}"; do [[ -f "${OUT}/${f}" ]] || missing+=("$f"); done
if [[ ${#missing[@]} -gt 0 ]]; then
  echo "ERROR: not in ${OUT}/: ${missing[*]}" >&2
  echo "       Build them first:" >&2
  echo "         ./deploy/make-offline-bundle.sh ${TAG}   # the DTO package" >&2
  echo "         ./deploy/make-share-archives.sh ${TAG}   # source, artifacts" >&2
  exit 1
fi

# Verify every archive locally before uploading. A corrupt object behind a URL
# is expensive to diagnose from the far side and cheap to catch here.
echo "==> verifying checksums"
if command -v sha256sum >/dev/null; then SHA_C="sha256sum -c"; else SHA_C="shasum -a 256 -c"; fi
for f in "${FILES[@]}"; do
  case "$f" in *.sha256) ( cd "$OUT" && $SHA_C "$f" ) ;; esac
done

echo "==> uploading to s3://${BUCKET}/${PREFIX}/"
for f in "${FILES[@]}"; do
  # Content types matter: served as the default binary/octet-stream a browser
  # offers a download, but the .sha256 sidecars are meant to be readable in a
  # browser window, and a mistyped tarball can be silently re-encoded by an
  # intermediary. max-age is short so a re-upload or a takedown is visible
  # quickly rather than being served from an edge cache for a day.
  case "$f" in
    *.sha256) CT="text/plain" ;;
    *)        CT="application/gzip" ;;
  esac
  "${AWS[@]}" s3 cp "${OUT}/${f}" "s3://${BUCKET}/${PREFIX}/${f}" \
    --content-type "$CT" --cache-control "public,max-age=300" --only-show-errors
  echo "  ${f}  ($(du -h "${OUT}/${f}" | cut -f1))"
done

invalidate

echo
echo "Published:"
echo
for a in "${ARCHIVES[@]}"; do
  [[ -f "${OUT}/${a}" ]] || continue
  case "$a" in
    *-src.tar.gz)       WHAT="source only — the code, no media" ;;
    *-artifacts.tar.gz) WHAT="artifacts + video — HCD, guides, deck, walkthroughs" ;;
    *)                  WHAT="full package — images, manifests, runbook, source" ;;
  esac
  printf '  %-24s %s\n' "$(du -h "${OUT}/${a}" | cut -f1)" "$WHAT"
  echo "    ${SITE}/${PREFIX}/${a}"
  echo "    ${SITE}/${PREFIX}/${a}.sha256"
  echo
done

cat <<EOF
Verify any of them from anywhere, with no credentials:

  curl -fsSLO ${SITE}/${PREFIX}/<file>
  curl -fsSLO ${SITE}/${PREFIX}/<file>.sha256
  ${SHA_C} <file>.sha256

These URLs are public and do not expire. Take them ALL down when the hand-off
is done — nothing else will:

  $0 ${TAG}${PROFILE:+ --profile ${PROFILE}} --remove
EOF
