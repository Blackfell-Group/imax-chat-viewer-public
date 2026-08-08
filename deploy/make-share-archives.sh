#!/bin/bash
# Two archives, split by what a transfer route can carry rather than by topic.
#
#   ./deploy/make-share-archives.sh [TAG] [OUTDIR]
#
# WHY THIS SPLIT. The routes into the enclave are not interchangeable:
#
#   - the source-transfer system carries open-source software, and anything on it is visible to
#     and downloadable by anyone at the agency. That is fine for some things
#     and wrong for others, and it is not our call to make silently.
#   - A separate manual process moves SMALL files, one at a time.
#
# So the dividing line is source versus everything else, and the source side is
# kept as small as it can be so the manual route stays available to it:
#
#   -src        Source code only. Under a megabyte. Everything needed to BUILD
#               the six images and deploy them — both Dockerfiles, both
#               committed lockfiles, the manifests, both TLS overlays.
#   -artifacts  Everything that is not source code: the HCD work, the guides,
#               the deck, board exports, the evidence trail, the walkthrough
#               recordings, AND the pre-built container images. Everything
#               needed to RUN it without building anything, plus everything a
#               reviewer reads rather than runs.
#
# Between them they are the whole delivery, so there is no third archive: the
# old combined bundle was these two glued together.
#
# The images are lifted from the bundle CI produced rather than rebuilt here.
# That matters twice over: they are linux/amd64 (a local build on an Apple
# Silicon Mac is arm64 and would die in the enclave with an exec format error),
# and they are the exact images that passed the trivy CRITICAL gate and the
# cluster rollout. Rebuilding them locally would break the chain between what
# was scanned and what crosses.
set -euo pipefail
cd "$(dirname "$0")/.."

TAG="${1:-0.1.0}"
OUT="${2:-dist-bundle}"
BUNDLE="${OUT}/imax-prototype-${TAG}.tar.gz"

if command -v sha256sum >/dev/null; then SHA=sha256sum; else SHA="shasum -a 256"; fi

git rev-parse --git-dir >/dev/null 2>&1 || {
  echo "ERROR: not a git checkout — the source archive is built from HEAD." >&2; exit 1; }
if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: the working tree has uncommitted changes." >&2
  echo "       These archives are built from HEAD, so they would not reflect" >&2
  echo "       what you are looking at. Commit or stash first." >&2
  echo >&2
  git status --short >&2
  exit 1
fi

mkdir -p "$OUT"
COMMIT="$(git rev-parse HEAD)"
STAGE="${OUT}/.stage-artifacts-${TAG}"
rm -rf "$STAGE"

# --- source ----------------------------------------------------------------
# Code and the things that build and deploy it. Everything a human reads rather
# than runs lives in the other archive, so this stays small enough for the
# manual small-file route.
echo "==> source archive"
git archive --format=tar.gz -o "${OUT}/imax-prototype-${TAG}-src.tar.gz" \
  --prefix="imax-prototype-${TAG}-src/" HEAD -- . \
  ':(exclude)hcd' ':(exclude)project' ':(exclude)docs' ':(exclude)DELIVERY.md' \
  ':(exclude)*.mp4' ':(exclude)*.pdf'
( cd "$OUT" && $SHA "imax-prototype-${TAG}-src.tar.gz" > "imax-prototype-${TAG}-src.tar.gz.sha256" )

# --- artifacts: non-source, including the pre-built images -----------------
echo "==> artifacts archive"
mkdir -p "$STAGE"

# The reviewable half.
git archive --format=tar HEAD -- hcd project docs DELIVERY.md README.md \
  | tar -x -C "$STAGE"

# The runnable half, taken from the CI bundle so the images are the scanned
# amd64 ones. Also carries the deployment kit, so this archive can be deployed
# on its own without needing the source archive alongside it — the two travel
# by different routes and may not arrive together.
if [[ ! -f "$BUNDLE" ]]; then
  echo "ERROR: ${BUNDLE} not found — it carries the built images." >&2
  echo "       Download the CI artifact (AIRGAP.md §1), or build locally with" >&2
  echo "       ./deploy/make-offline-bundle.sh ${TAG}" >&2
  exit 1
fi
echo "  lifting images and deployment kit from $(basename "$BUNDLE")"
TMPX="${OUT}/.unpack-${TAG}"
rm -rf "$TMPX"; mkdir -p "$TMPX"
tar -xzf "$BUNDLE" -C "$TMPX"
SRCDIR="${TMPX}/imax-prototype-${TAG}"
[[ -d "$SRCDIR/images" ]] || { echo "ERROR: no images/ inside ${BUNDLE}" >&2; exit 1; }
cp -R "$SRCDIR/images" "$STAGE/"
cp -R "$SRCDIR/k8s" "$SRCDIR/overlays" "$STAGE/"
cp "$SRCDIR/load-and-deploy.sh" "$SRCDIR/enclave-ca.sh" "$STAGE/"
cp "$SRCDIR/README.md" "$STAGE/DEPLOY-README.md"
chmod +x "$STAGE/load-and-deploy.sh" "$STAGE/enclave-ca.sh"
rm -rf "$TMPX"

# Record what the images are and where the rest came from, so the two archives
# can be tied to each other after they arrive by different routes.
printf '%s\n' "$COMMIT" > "$STAGE/SOURCE_COMMIT.txt"
( cd "$STAGE" && find . -type f ! -name SHA256SUMS -exec $SHA {} + | sort -k2 > SHA256SUMS )

tar -czf "${OUT}/imax-prototype-${TAG}-artifacts.tar.gz" \
  -C "$OUT" --transform "s|^\.stage-artifacts-${TAG}|imax-prototype-${TAG}-artifacts|" \
  ".stage-artifacts-${TAG}" 2>/dev/null \
  || ( mv "$STAGE" "${OUT}/imax-prototype-${TAG}-artifacts" \
       && tar -czf "${OUT}/imax-prototype-${TAG}-artifacts.tar.gz" \
            -C "$OUT" "imax-prototype-${TAG}-artifacts" \
       && rm -rf "${OUT}/imax-prototype-${TAG}-artifacts" )
rm -rf "$STAGE"
( cd "$OUT" && $SHA "imax-prototype-${TAG}-artifacts.tar.gz" > "imax-prototype-${TAG}-artifacts.tar.gz.sha256" )

echo
printf 'source:    %s  (%s)  — build it\n' \
  "${OUT}/imax-prototype-${TAG}-src.tar.gz" \
  "$(du -h "${OUT}/imax-prototype-${TAG}-src.tar.gz" | cut -f1)"
printf 'artifacts: %s  (%s)  — run it, and read it\n' \
  "${OUT}/imax-prototype-${TAG}-artifacts.tar.gz" \
  "$(du -h "${OUT}/imax-prototype-${TAG}-artifacts.tar.gz" | cut -f1)"
echo "both from commit ${COMMIT}"
echo
echo "Publish:  ./deploy/publish-bundle.sh ${TAG}"
