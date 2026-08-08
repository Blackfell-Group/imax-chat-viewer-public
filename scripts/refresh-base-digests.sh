#!/bin/bash
# Re-resolve the base-image digests pinned in deploy/Dockerfile.{spa,mock} and
# rewrite them in place. Run low-side when you want to pick up a newer base;
# commit the result so what CI scans is exactly what ships.
#
#   ./scripts/refresh-base-digests.sh
#
# Uses crane (daemonless — no Docker required). brew install crane.
set -euo pipefail
cd "$(dirname "$0")/.."

command -v crane >/dev/null || { echo "crane not found (brew install crane)" >&2; exit 1; }

pin() {
  local ref="$1" file="$2" arg="$3"
  local digest
  digest="$(crane digest "$ref")"
  echo "  ${arg} ${ref}@${digest}"
  # Replace the whole default value of that ARG, digest or not.
  perl -pi -e "s|^(ARG ${arg}=)\Q${ref}\E(\@sha256:[0-9a-f]+)?\$|\${1}${ref}\@${digest}|" "$file"
}

echo "==> resolving digests"
pin node:22-alpine                            deploy/Dockerfile.spa  NODE_BASE
pin node:22-alpine                            deploy/Dockerfile.mock NODE_BASE

echo "==> pinned"
grep -hn '^ARG NODE_BASE=' deploy/Dockerfile.spa deploy/Dockerfile.mock
