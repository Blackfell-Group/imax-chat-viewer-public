#!/usr/bin/env bash
#
# Publish the package to the public mirror.
#
#   ./scripts/publish-mirror.sh            # show what would go, change nothing
#   ./scripts/publish-mirror.sh --push     # actually publish
#
# The mirror is the Government-directed transfer route: source is imported into
# the enclave from it. Everything in this repository goes except the files
# listed in EXCLUDE below.
#
# WHY THIS SQUASHES. A file that is committed and later deleted is still in the
# history, and GitHub keeps it fetchable by SHA long after nothing references
# it — deleting is not un-publishing. So the mirror is published as ONE commit
# containing exactly what should be public, and an excluded file is not
# "removed", it was never there. This is the same lesson the 7 August rebuild
# learned the expensive way; see project/acceptance/signed_ot_audit.md §2.1.
#
# Consequence worth knowing: this force-pushes a fresh single commit each time,
# so the mirror carries no history. That is deliberate. The private repository
# is the history.
set -euo pipefail
cd "$(dirname "$0")/.."

MIRROR="${MIRROR_REPO:-Blackfell-Group/imax-chat-viewer-public}"

# Paths that must NEVER reach the mirror. Anchored, one per line.
#
#   Contract-administration working papers. Internal notes between River Hawk
#     and the Agreements Officer, not part of the delivered package.
EXCLUDE=(
  'project/acceptance/signed_ot_audit.md'
  'project/acceptance/m2_evidence_checklist.md'
)

TAG="${1:-}"; [[ "$TAG" == "--push" ]] && TAG=""
PUSH=0
for a in "$@"; do [[ "$a" == "--push" ]] && PUSH=1; done

# --- build the file list ----------------------------------------------------
mapfile -t ALL < <(git ls-files)
KEEP=()
DROPPED=()
for f in "${ALL[@]}"; do
  skip=0
  for x in "${EXCLUDE[@]}"; do [[ "$f" == "$x" ]] && skip=1 && break; done
  if [[ $skip -eq 1 ]]; then DROPPED+=("$f"); else KEEP+=("$f"); fi
done

echo "==> mirror: $MIRROR"
echo "    ${#KEEP[@]} files to publish, ${#DROPPED[@]} held back"
for f in "${DROPPED[@]}"; do echo "      held back: $f"; done

# Every exclusion must actually exist, or the list has gone stale against a
# rename and is protecting nothing.
missing=0
for x in "${EXCLUDE[@]}"; do
  if ! printf '%s\n' "${ALL[@]}" | grep -qxF "$x"; then
    echo "    WARNING: exclusion '$x' matches no tracked file — renamed or deleted?" >&2
    missing=1
  fi
done
[[ $missing -eq 1 ]] && echo "    check EXCLUDE before publishing" >&2

if [[ $PUSH -eq 0 ]]; then
  echo
  echo "    dry run. Re-run with --push to publish."
  exit 0
fi

# --- assemble a clean tree --------------------------------------------------
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
printf '%s\0' "${KEEP[@]}" | xargs -0 git archive --format=tar HEAD -- | tar -x -C "$WORK"

# Prove the exclusions are absent from what is about to be published.
for x in "${EXCLUDE[@]}"; do
  if [[ -e "$WORK/$x" ]]; then
    echo "    ABORT: $x is present in the staged tree" >&2
    exit 1
  fi
done
echo "    verified: no held-back file is in the staged tree"

# --- one commit, no history -------------------------------------------------
REV="$(git rev-parse --short HEAD)"
# Only carry a tag when HEAD IS one. `git describe` otherwise invents
# "v1.2.1-prototype-1-gb59726d", which is not a release and should not look
# like one on the mirror.
DESC="$(git describe --tags --exact-match HEAD 2>/dev/null || true)"
WHO_NAME="$(git config user.name || echo 'River Hawk Consulting')"
WHO_MAIL="$(git config user.email || echo 'noreply@riverhawkconsultingllc.com')"
cd "$WORK"
git init -q -b main .
git add -A
git -c user.name="$WHO_NAME" -c user.email="$WHO_MAIL" commit -q -m "IMAX chat-viewer prototype — ${DESC:-$REV}

Published from the private repository at $REV.

Single commit by design: this mirror carries no history, so a file that is
not here has never been here. The private repository is the history."

echo "    committed $(git rev-list --count HEAD) commit, $(git ls-files | wc -l | tr -d ' ') files"

TOKEN="$(gh auth token)"
git remote add origin "https://x-access-token:${TOKEN}@github.com/${MIRROR}.git"
git push --force --quiet origin main
echo "    pushed main"

if [[ -n "$DESC" ]]; then
  git tag -a "$DESC" -m "IMAX chat-viewer prototype — $DESC"
  git push --force --quiet origin "$DESC"
  echo "    pushed tag $DESC"
else
  echo "    HEAD is not tagged — published untagged (tag it and re-run for a release)"
fi

echo
echo "==> https://github.com/${MIRROR}"
