#!/bin/bash
# Render the HCD artifacts (Deliverable ①) as one publication-quality PDF.
#
#   ./scripts/make-hcd-pdf.sh [output.pdf]
#
# The HCD artifacts are a contract deliverable, and they were the only one
# still being handed over as raw markdown while the guides, the deck and the
# compliance matrix all had PDFs in project/delivery/. This closes that gap.
#
# It is a script rather than a one-off command because the other five PDFs were
# made by hand, which is why nothing regenerates them when their markdown
# changes and why they can quietly go stale. Editing hcd/*.md and re-running
# this is the whole update path.
#
# Assembles the seven files into one document in reading order: what the set is,
# who the users are, what they feel, what the screens do, and then the three
# findings that changed the design during performance.
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="${1:-project/delivery/hcd_artifacts.pdf}"

P="${MAKE_PDF_BIN:-$HOME/.claude/skills/gstack/make-pdf/dist/pdf}"
[[ -x "$P" ]] || { echo "ERROR: make-pdf not found at $P" >&2; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
DOC="$WORK/hcd_artifacts.md"

# Each source file's H1 carries "— IMAX Chat-Viewer (Deliverable ① …)" so it
# stands alone in the repository. Collected into one document that suffix is on
# every chapter and every TOC line, so it is stripped here — the cover says it
# once instead.
emit() {
  local file="$1" title="$2"
  printf '\n# %s\n\n' "$title" >> "$DOC"
  # Drop the original H1 and the blank line after it; keep everything else.
  awk 'NR==1 && /^# / {skip=1; next} skip && /^$/ {skip=0; next} {print}' "$file" >> "$DOC"
  printf '\n' >> "$DOC"
}

cat > "$DOC" <<'HEADER'
UNCLASSIFIED. Fabricated composite personas and demonstration content for the
prototype's human-centered design baseline, derived from the Phase 2 solution
demonstration and its evaluated workflows. No real persons or positions are
described.

Built-state evidence for every annotated screen — live screenshots, test
results, and the parity baseline against the evaluated demo — accompanies this
delivery under `project/evidence/`.
HEADER

# Reading order follows the TDD's Task 2 subtasks: who the users are (2.1), what
# they feel (2.1), the journey they run (2.2), the screens that serve it (2.3),
# and then the validation and traceability that ties it together (2.4). The
# three workflow-model findings come last because they record what CHANGED
# during performance, which only makes sense once the baseline is established.
emit hcd/README.md                  "The Artifacts in This Set"
emit hcd/personas.md                "Personas"
emit hcd/empathy_maps.md            "Empathy Maps"
emit hcd/journey_map.md             "Task Flows & Journey Map"
emit hcd/wireframes.md              "Annotated Wireframes"
emit hcd/traceability_matrix.md     "Pain-to-Design Traceability Matrix"
emit hcd/assumption_log.md          "Assumption Log"
emit hcd/linguist_workflow_model.md "Workflow Model: The Linguist's Finite Stack"
emit hcd/bilingual_display_model.md "Workflow Model: No Verdict Without the Source"
emit hcd/one_output_model.md        "Workflow Model: A Linguist's Bench, One Output"

# The one relative link in the set points at a sibling directory and cannot
# resolve from a PDF. Say where it is instead of leaving a dead reference.
sed -i.bak 's|\[`../project/evidence/`\](../project/evidence/README.md)|`project/evidence/` (accompanying this delivery)|g' "$DOC"
rm -f "$DOC.bak"

# Footer marked UNCLASSIFIED, not the renderer's default CONFIDENTIAL. This
# material IS unclassified — every screen carries an UNCLASS banner and the
# solicitation says so — and marking it otherwise on a Government deliverable is
# a classification error, not a formatting preference. The first render of this
# document carried CONFIDENTIAL on 40 of 41 pages; the other five delivery PDFs
# never did, which is how it was caught.
FOOTER='<div style="width:100%;font-size:8px;font-family:Helvetica,Arial,sans-serif;color:#666;padding:0 1in;display:flex;justify-content:space-between;"><span>UNCLASSIFIED</span><span><span class="pageNumber"></span> of <span class="totalPages"></span></span></div>'

mkdir -p "$(dirname "$OUT")"
"$P" generate --cover --toc --no-confidential \
  --footer-template "$FOOTER" \
  --title "HCD Artifacts" \
  --author "River Hawk Consulting, LLC · IMAX HCD Prototype OT · Deliverable ①" \
  "$DOC" "$OUT" >/dev/null

echo "$OUT ($(du -h "$OUT" | cut -f1))"
