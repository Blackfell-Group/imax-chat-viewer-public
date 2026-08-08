#!/bin/bash
# Render the markdown deliverables as PDFs into project/delivery/.
#
#   ./scripts/make-delivery-pdfs.sh            # all of them
#   ./scripts/make-delivery-pdfs.sh compliance # just one
#
# The original five PDFs in project/delivery/ were produced by hand. That is why
# nothing regenerated them when their markdown moved, and why the compliance
# matrix could sit at a 1 August scoring while the package moved five commits
# past it. A script is the difference between a document that tracks the work
# and one that describes the day it was exported.
#
# The HCD artifacts are assembled from seven files and have their own script;
# this calls it rather than duplicating the logic.
#
# Every PDF is footer-marked UNCLASSIFIED. The renderer's default footer says
# CONFIDENTIAL, which on this material is a classification error rather than a
# styling choice — the solicitation says the work and its deliverables are
# unclassified, and every screen carries an UNCLASS banner.
set -euo pipefail
cd "$(dirname "$0")/.."

WHICH="${1:-all}"
P="${MAKE_PDF_BIN:-$HOME/.claude/skills/gstack/make-pdf/dist/pdf}"
[[ -x "$P" ]] || { echo "ERROR: make-pdf not found at $P" >&2; exit 1; }

FOOTER='<div style="width:100%;font-size:8px;font-family:Helvetica,Arial,sans-serif;color:#666;padding:0 1in;display:flex;justify-content:space-between;"><span>UNCLASSIFIED</span><span><span class="pageNumber"></span> of <span class="totalPages"></span></span></div>'

render() {
  local src="$1" out="$2" title="$3" margins="${4:-1in}"
  "$P" generate --cover --toc --no-confidential \
    --margins "$margins" \
    --footer-template "$FOOTER" \
    --title "$title" \
    --author "River Hawk Consulting, LLC · IMAX HCD Prototype OT" \
    "$src" "$out" >/dev/null
  printf '  %-46s %s\n' "$out" "$(du -h "$out" | cut -f1)"
}

if [[ "$WHICH" == "all" || "$WHICH" == "hcd" ]]; then
  ./scripts/make-hcd-pdf.sh >/dev/null
  printf '  %-46s %s\n' "project/delivery/hcd_artifacts.pdf" \
    "$(du -h project/delivery/hcd_artifacts.pdf | cut -f1)"
fi

if [[ "$WHICH" == "all" || "$WHICH" == "compliance" ]]; then
  # Narrower margins than the rest: this document is five-column tables with a
  # long Notes column, and at 1in they compress into a hard-to-read ladder.
  # The prose documents keep 1in.
  render project/acceptance/requirements_compliance.md \
    project/delivery/requirements_compliance.pdf \
    "Requirements Compliance Matrix" \
    "0.6in"
fi

if [[ "$WHICH" == "all" || "$WHICH" == "guides" ]]; then
  render docs/user_guide.md      project/delivery/user_guide.pdf      "User Guide"
  render docs/developer_guide.md project/delivery/developer_guide.pdf "Developer Guide"
  render deploy/README.md        project/delivery/deployment_guide.pdf "Deployment Guide"
fi

if [[ "$WHICH" == "all" || "$WHICH" == "deck" ]]; then
  render project/acceptance/acceptance_deck.md \
    project/delivery/acceptance_deck.pdf \
    "Acceptance Deck"
fi

# TDD data deliverable D3: "Playwright end-to-end smoke tests, test scripts, and
# final results report", format "In repo + PDF". The report is generated from
# the Playwright JSON reporter output so it cannot drift from the run.
if [[ "$WHICH" == "all" || "$WHICH" == "test-results" ]]; then
  node scripts/make-test-report.js >/dev/null
  render project/acceptance/test_results.md \
    project/delivery/test_results.pdf \
    "Test Results Report" \
    "0.7in"
fi

# TDD data deliverable D5: sprint-board export, burndown chart and risk register,
# format "PDF/CSV". All three were maintained as Markdown and never rendered.
# They ship as one document because they are read together — the board says what
# was done, the burndown says at what rate, the register says what was in the
# way — plus a CSV of the board for anyone who wants the rows.
if [[ "$WHICH" == "all" || "$WHICH" == "artifacts" ]]; then
  {
    echo "# Project Artifacts"
    echo
    echo "**TDD data deliverable D5** · Agreement No. 5600002690012"
    echo "River Hawk Consulting, LLC · UNCLASSIFIED"
    echo
    echo "Sprint-board export, burndown chart and risk register in their final state."
    echo "Maintained daily during performance rather than reconstructed at the end."
    echo
    echo "---"
    echo
    sed '1s/^# /# Sprint Board — /' project/acceptance/board_export_final.md
    echo
    echo "---"
    echo
    cat project/burndown.md
    echo
    echo "---"
    echo
    cat project/risk_register.md
  } > project/acceptance/project_artifacts.md

  render project/acceptance/project_artifacts.md \
    project/delivery/project_artifacts.pdf \
    "Project Artifacts" \
    "0.7in"

  node scripts/board-export-csv.js
  printf '  %-46s %s\n' "project/delivery/board_export_final.csv" \
    "$(du -h project/delivery/board_export_final.csv | cut -f1)"
fi

# Article XII: "the architecture the Performer will deliver prior to the end of
# the period of performance", against the Article I(b) definition.
if [[ "$WHICH" == "all" || "$WHICH" == "architecture" ]]; then
  render docs/architecture.md \
    project/delivery/architecture.pdf \
    "System Architecture"
fi

# Article VIII(b) milestone-accomplishment documentation.
if [[ "$WHICH" == "all" || "$WHICH" == "milestones" ]]; then
  render project/acceptance/milestone_record.md \
    project/delivery/milestone_record.pdf \
    "Milestone Accomplishment Record" \
    "0.7in"
fi
