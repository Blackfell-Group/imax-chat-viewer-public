#!/bin/bash
# Assemble the transfer bundle: ONE archive carrying the six built images, the
# manifests, the runbook, checksums, AND the complete source repository.
#
#   ./deploy/make-offline-bundle.sh [TAG] [OUTDIR]
#
# ONE ARCHIVE, deliberately. This crosses by DTO, and a DTO submission is a
# unit: two files are two things to track, two things to review, and two things
# that can arrive apart. Both ways in (§2) are therefore inside one package —
# ferry the built images, or hand `src/` to the yard and let it rebuild — and
# the recipient chooses on the far side rather than us guessing on this one.
#
# CI runs this after the trivy gate and the kind cluster smoke, so the bundle
# it publishes is provably the same image set that passed both. That matters:
# a one-way transfer gives no chance to re-check on the other side, and
# rebuilding to produce the media would break the chain between what was
# scanned and what crosses.
#
# The output has no dependency on this repository or on a network — untar it
# in the enclave and everything needed to load, run, or rebuild is inside.
set -euo pipefail
cd "$(dirname "$0")/.."

TAG="${1:-0.1.0}"
OUT="${2:-dist-bundle}"

# The source half carries the whole repository, media included. §1 used to
# leave the MP4s and PDFs out because media draws the most scrutiny in transfer
# review and none of it is needed to build or run — that judgement is still on
# the record, and this is the switch for it. Default is everything: a DTO
# package that is missing the demo it refers to is its own kind of problem.
#
#   NO_MEDIA=1 ./deploy/make-offline-bundle.sh
NO_MEDIA="${NO_MEDIA:-0}"

# coreutils on Linux, perl's shasum on macOS — the bundle gets built in both places.
if command -v sha256sum >/dev/null; then SHA=sha256sum; else SHA="shasum -a 256"; fi
IMAGES=(imax-spa imax-mock-search imax-mock-translation imax-mock-entities imax-mock-summarize imax-mock-ocr)
STAGE="${OUT}/imax-prototype-${TAG}"

rm -rf "$STAGE"; mkdir -p "$STAGE/images" "$STAGE/k8s"

# Architecture gate. Built on an Apple Silicon Mac these come out linux/arm64;
# the target cluster is x86_64. The images load into the enclave without
# complaint and then every pod dies with an exec format error — a failure that
# costs a full DTO cycle to discover and looks nothing like its cause. Checked
# rather than remembered, because the machine that builds the media is exactly
# the machine least likely to notice.
#
#   TARGET_ARCH=arm64 ./deploy/make-offline-bundle.sh   # if that is really intended
TARGET_ARCH="${TARGET_ARCH:-amd64}"
echo "==> checking image architecture (want ${TARGET_ARCH})"
for IMG in "${IMAGES[@]}"; do
  ARCH="$(docker image inspect "${IMG}:${TAG}" --format '{{.Architecture}}' 2>/dev/null || true)"
  if [[ -z "$ARCH" ]]; then
    echo "ERROR: ${IMG}:${TAG} not found. Build first: ./deploy/build-images.sh ${TAG}" >&2
    exit 1
  fi
  if [[ "$ARCH" != "$TARGET_ARCH" ]]; then
    echo "ERROR: ${IMG}:${TAG} is ${ARCH}, expected ${TARGET_ARCH}." >&2
    echo "       These images would load in the enclave and fail to start." >&2
    echo "       Take the bundle from CI (AIRGAP.md §1), or rebuild:" >&2
    echo "         PLATFORM=linux/${TARGET_ARCH} ./deploy/build-images.sh ${TAG}" >&2
    exit 1
  fi
done
echo "  all ${#IMAGES[@]} are ${TARGET_ARCH}"

echo "==> saving ${#IMAGES[@]} images"
REFS=()
for IMG in "${IMAGES[@]}"; do REFS+=("${IMG}:${TAG}"); done
# One archive for all six: shared base layers are stored once, which roughly
# halves the media footprint versus six separate saves.
docker save "${REFS[@]}" -o "$STAGE/images/imax-images-${TAG}.tar"
gzip -f "$STAGE/images/imax-images-${TAG}.tar"

echo "==> recording image digests"
for IMG in "${IMAGES[@]}"; do
  printf '%s:%s  %s\n' "$IMG" "$TAG" \
    "$(docker image inspect "${IMG}:${TAG}" --format '{{.Id}}')"
done > "$STAGE/images/DIGESTS.txt"

echo "==> copying manifests and docs"
# Layout mirrors the repo so each overlay's `resources: ../../k8s` resolves
# unchanged: <bundle>/overlays/tls/../../k8s → <bundle>/k8s.
#
# Both overlays travel. tls-awssm is the target environment path (certificates from AWS
# Secrets Manager); tls is the one for a cluster where someone has PEM files in
# hand. Which applies is decided on the far side, so shipping only one would be
# deciding it here.
mkdir -p "$STAGE/overlays/tls" "$STAGE/overlays/tls-awssm"
cp deploy/k8s/*.yaml "$STAGE/k8s/"
cp deploy/overlays/tls/*.yaml "$STAGE/overlays/tls/"
cp deploy/overlays/tls-awssm/*.yaml "$STAGE/overlays/tls-awssm/"
cp deploy/enclave-ca.sh "$STAGE/"
cp deploy/AIRGAP.md "$STAGE/README.md"
chmod +x "$STAGE/enclave-ca.sh"

# The complete source repository, so the yard can rebuild from the same commit
# that produced the images beside it (§2 path B). `git archive` reads HEAD,
# which is why the clean-tree check below refuses to build a bundle whose two
# halves would disagree.
echo "==> copying source repository"
if git rev-parse --git-dir >/dev/null 2>&1; then
  SRC_PATHS=(.)
  if [[ "$NO_MEDIA" == "1" ]]; then
    SRC_PATHS+=(':(exclude)*.mp4' ':(exclude)project/evidence/screens/*' ':(exclude)*.pdf')
    echo "  NO_MEDIA=1 — excluding MP4s, PDFs and evidence screens"
  fi
  mkdir -p "$STAGE/src"
  # --one-top-level is GNU tar only; macOS ships bsdtar, and this gets built in
  # both places. Extracting into a directory we made ourselves works on either.
  git archive --format=tar HEAD -- "${SRC_PATHS[@]}" | tar -x -C "$STAGE/src"
  echo "  $(find "$STAGE/src" -type f | wc -l | tr -d ' ') files, $(du -sh "$STAGE/src" | cut -f1)"
else
  echo "  not a git checkout — source omitted, images only" >&2
fi

cat > "$STAGE/load-and-deploy.sh" <<'EOF'
#!/bin/bash
# Load the images onto this cluster and deploy. Run in the enclave.
#
#   ./load-and-deploy.sh [--registry <prefix>/] [--tls | --tls-awssm]
#
# --registry   push the images there and retarget the manifests. Omit it only if
#              the images are already on every node (docker load on each, or
#              containerd `ctr -n k8s.io images import`) — a kubelet resolves a
#              bare name against Docker Hub, which is unreachable here.
# --tls        apply the TLS overlay instead of the plaintext base: every pod
#              serves https and the SPA edge dials the enrichment pods over TLS.
#              Requires the imax-tls Secret to exist first (see README §10).
# --tls-awssm  same, but each pod fetches its certificate from AWS Secrets
#              Manager at start instead of reading a Secret someone created.
#              This is the target environment path. Requires imax-tls-source to be
#              filled in — endpoint and secret names (README §10, option B).
#
# The source repository is in src/ if this cluster will not run an image it did
# not build (README §2, path B).
set -euo pipefail
cd "$(dirname "$0")"
TAG="$(ls images/imax-images-*.tar.gz | sed 's/.*imax-images-\(.*\)\.tar\.gz/\1/')"
IMAGES=(imax-spa imax-mock-search imax-mock-translation imax-mock-entities imax-mock-summarize imax-mock-ocr)
PREFIX=""; TLS=false; AWSSM=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --registry)  PREFIX="$2"; shift 2 ;;
    --tls)       TLS=true; shift ;;
    --tls-awssm) AWSSM=true; shift ;;
    *)           echo "unknown argument: $1" >&2; exit 1 ;;
  esac
done

if $TLS && $AWSSM; then
  echo "ERROR: --tls and --tls-awssm are two sources for the same thing; pick one." >&2
  exit 1
fi

echo "==> loading images (tag ${TAG})"
gunzip -c "images/imax-images-${TAG}.tar.gz" | docker load

if [[ -n "$PREFIX" ]]; then
  echo "==> pushing to ${PREFIX}"
  for IMG in "${IMAGES[@]}"; do
    docker tag "${IMG}:${TAG}" "${PREFIX}${IMG}:${TAG}"
    docker push "${PREFIX}${IMG}:${TAG}"
    ( cd k8s && kustomize edit set image "${IMG}=${PREFIX}${IMG}:${TAG}" )
  done
fi

if $TLS; then
  kubectl get secret imax-tls >/dev/null 2>&1 || {
    echo "ERROR: --tls needs the imax-tls Secret (tls.crt, tls.key, ca.pem)." >&2
    echo "       Create it first — see README §10, option A." >&2
    exit 1
  }
  TARGET=overlays/tls
elif $AWSSM; then
  TARGET=overlays/tls-awssm
else
  TARGET=k8s
fi

echo "==> deploying ${TARGET}"
kubectl apply -k "$TARGET"
kubectl rollout status deploy -l part-of=imax-chat-viewer --timeout=180s

SCHEME=http; CACERT=""
if $TLS || $AWSSM; then SCHEME=https; CACERT=" --cacert <ca>.pem"; fi
if $AWSSM; then
  echo
  echo "If a pod sits in Init:Error, the certificate fetch is what failed:"
  echo "  kubectl logs deploy/imax-spa -c fetch-certs   # README §10 triage table"
fi
echo
echo "Smoke it:"
echo "  kubectl port-forward svc/imax-spa 8443:8443 &"
echo "  curl -sf${CACERT} ${SCHEME}://localhost:8443/healthz"
echo "  curl -sf${CACERT} ${SCHEME}://localhost:8443/api/search/threads | head -c 200"
echo "  curl -sf${CACERT} ${SCHEME}://localhost:8443/api/whoami        # who the front says you are"
echo
echo "Then open the UI. The toolbar must show ICONS — if you see the words"
echo "'translate' or 'chevron_right', the fonts did not ship (README §4)."
EOF
chmod +x "$STAGE/load-and-deploy.sh"

# Provenance for the source half, recorded BEFORE the checksums so it is
# covered by SHA256SUMS and travels inside the bundle. images/DIGESTS.txt does
# the same job for the image half; together they let anyone on the far side tie
# the two archives to each other.
#
# The check is here rather than beside the `git archive` call below because it
# has to fail before anything is sealed: `git archive` reads HEAD while the
# images above were built from the WORKING TREE, so uncommitted work would ship
# in path A and not in path B, and the recipient's rebuild would silently
# produce something other than the images they were sent. On a one-way transfer
# that is worth stopping for.
if git rev-parse --git-dir >/dev/null 2>&1; then
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "ERROR: the working tree has uncommitted changes." >&2
    echo "       The images were built from the working tree, but the source" >&2
    echo "       archive is built from HEAD — they would not match." >&2
    echo "       Commit or stash first, then rebuild:" >&2
    echo >&2
    git status --short >&2
    exit 1
  fi
  git rev-parse HEAD > "$STAGE/SOURCE_COMMIT.txt"
fi

echo "==> checksums"
( cd "$STAGE" && find . -type f ! -name SHA256SUMS -exec $SHA {} + | sort -k2 > SHA256SUMS )

echo "==> archiving"
tar -czf "${OUT}/imax-prototype-${TAG}.tar.gz" -C "$OUT" "imax-prototype-${TAG}"
# Checksum recorded against the bare filename, not the build path: the file is
# verified after a media hop, in a directory that has nothing to do with this
# one, and `shasum -c` fails on a stale path prefix.
( cd "$OUT" && $SHA "imax-prototype-${TAG}.tar.gz" > "imax-prototype-${TAG}.tar.gz.sha256" )

echo
echo "bundle: ${OUT}/imax-prototype-${TAG}.tar.gz  ($(du -h "${OUT}/imax-prototype-${TAG}.tar.gz" | cut -f1))"
cat "${OUT}/imax-prototype-${TAG}.tar.gz.sha256"
echo
echo "Contents:"
echo "  images/    six built images in one archive, plus their digests"
echo "  k8s/       base manifests            overlays/  tls and tls-awssm"
echo "  src/       the complete repository, for a yard rebuild"
echo
echo "Publish for download:  ./deploy/publish-bundle.sh ${TAG}"
