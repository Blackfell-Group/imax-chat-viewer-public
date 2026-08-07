#!/bin/bash
# Build the six-image delivery set (SPA + five enrichment pods).
# Run from the repo root: ./deploy/build-images.sh [TAG]
#
# Air-gap knobs (see deploy/AIRGAP.md) — all optional, all passed straight
# through to the Dockerfiles. Set them in the environment when building inside
# the enclave, where the public registries and npmjs.org are unreachable:
#
#   NODE_BASE=<approved node base>       default: public node:22-alpine, digest-pinned
#   NPM_REGISTRY=<internal npm mirror>   default: unset (npmjs.org)
#   OS_PATCH=0                           skip apk upgrade (no Alpine mirror reachable;
#                                        an approved hardened base is already patched)
#   IMAGE_PREFIX=<registry>/<project>/   default: unset (bare local names)
#   PLATFORM=linux/amd64                 default: unset (this machine's architecture)
#
# PLATFORM MATTERS MORE THAN IT LOOKS. Built on an Apple Silicon Mac these come
# out linux/arm64, and the target cluster is x86_64 — the images load without
# complaint and then every pod fails to start with an exec format error. On a
# one-way transfer that costs a full DTO cycle. CI builds on amd64, which is why
# AIRGAP.md §1 says to take the bundle from the Actions run rather than building
# it locally. Set PLATFORM=linux/amd64 if you must build it here; it runs under
# emulation and is slow.
#
# Example, in the yard:
#   NODE_BASE=<approved-base>:22 NPM_REGISTRY=<internal-mirror> OS_PATCH=0 \
#     IMAGE_PREFIX=<yard-host>/imax/ ./deploy/build-images.sh 1.0.0
set -euo pipefail
TAG="${1:-0.1.0}"
PREFIX="${IMAGE_PREFIX:-}"

BUILD_ARGS=()
[[ -n "${NODE_BASE:-}" ]]    && BUILD_ARGS+=(--build-arg "NODE_BASE=${NODE_BASE}")
[[ -n "${NPM_REGISTRY:-}" ]] && BUILD_ARGS+=(--build-arg "NPM_REGISTRY=${NPM_REGISTRY}")
[[ -n "${OS_PATCH:-}" ]]     && BUILD_ARGS+=(--build-arg "OS_PATCH=${OS_PATCH}")
[[ -n "${PLATFORM:-}" ]]     && BUILD_ARGS+=(--platform "${PLATFORM}")

# `${ARR[@]+"${ARR[@]}"}` rather than a bare `"${ARR[@]}"`: under `set -u`,
# bash 3.2 treats expanding an EMPTY array as expanding an unset variable and
# aborts. macOS still ships bash 3.2 as /bin/bash, so with none of the air-gap
# knobs set — the default, low-side case — this script could not run on a Mac
# at all. CI never caught it because ubuntu-latest has bash 5.

for SVC in search translation entities summarize ocr; do
  echo "==> ${PREFIX}imax-mock-${SVC}:${TAG}"
  docker build -f deploy/Dockerfile.mock \
    --build-arg "SERVICE=${SVC}" ${BUILD_ARGS[@]+"${BUILD_ARGS[@]}"} \
    -t "${PREFIX}imax-mock-${SVC}:${TAG}" .
done

echo "==> ${PREFIX}imax-spa:${TAG}"
docker build -f deploy/Dockerfile.spa ${BUILD_ARGS[@]+"${BUILD_ARGS[@]}"} \
  -t "${PREFIX}imax-spa:${TAG}" .

echo "Built:"
docker images --format '{{.Repository}}:{{.Tag}} ({{.Size}})' | grep -E "imax-" | sort
