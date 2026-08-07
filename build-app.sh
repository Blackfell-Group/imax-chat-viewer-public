#!/bin/bash
# Production build for the IMAX chat-viewer SPA. Matches the sibling-app
# convention: vite build → dist/.
set -euo pipefail
cd "$(dirname "$0")"
npx vite build
