#!/bin/bash
# Regenerate deploy/mock-package-lock.json from deploy/mock-package.json.
# Run low-side after changing the mock image's dependencies, and commit it —
# Dockerfile.mock installs with `npm ci`, which requires the lock to match.
set -euo pipefail
cd "$(dirname "$0")/.."

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cp deploy/mock-package.json "$TMP/package.json"
( cd "$TMP" && npm install --package-lock-only --omit=dev >/dev/null )
cp "$TMP/package-lock.json" deploy/mock-package-lock.json

node -e '
const l = require("./deploy/mock-package-lock.json");
const n = Object.keys(l.packages).filter(Boolean).length;
console.log(`deploy/mock-package-lock.json: ${n} packages`);
'
