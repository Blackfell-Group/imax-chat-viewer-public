# Evidence Index — IMAX Chat-Viewer Prototype OT (Phase 3)

UNCLASSIFIED — Running evidence trail for deliverable ⑥ (demo & acceptance package: test
results) and Sponsor touchpoints. Updated at each milestone; assembled into the acceptance
deck day 13.

## Acceptance harness status (the 7 ported Phase 2 smoke specs)

The Playwright suite that drove the evaluated React demo is the acceptance harness for the
Angular build (testids carry 1:1). Coverage as of **31 July (day 1)**:

| # | Smoke spec | Status vs Angular build | Evidence |
|---|---|---|---|
| 1 | Thread queue loads; Arabic renders RTL | ✅ **green** (verbatim in `tests/ng/viewer.spec.js`) | `e2e-results-2026-07-31.json` · `screens/day6-viewer-rtl-summary.png` |
| 2 | Translate → entities → clip with provenance → export | 🟡 **amended 1 Aug ×2** (auto-translate default; clip/export beats removed per the linguist-bench decision — translate/entity beats retained, entity extraction now thread-level) | `tests/ng/enrichment.spec.js` |
| 3 | Multi-language search + jump-to-message | ✅ **green** (verbatim in `tests/ng/viewer.spec.js`) | `screens/day6-hit-flash-landing.png` · `screens/search-1-crosslang.png` |
| 4 | Facet + group triage filters | ✅ **green** (verbatim in `tests/ng/search.spec.js`) | `screens/search-2-watchlist.png` |
| 5 | Content-type, language scope, queue disposition | 🟡 **amended 1 Aug** (content-type + scope beats verbatim; the queue-side disposition beat is now the real bench path — review the thread, promote, the stack ticks) | `screens/tour-2-working-stack.png` |
| 6 | Translation review + analyst note → gold copy | 🟡 **amended 1 Aug ×2** (auto-translate; note-clip beat removed — the note now travels into the promoted gold transcript, asserted in the export) | `tests/ng/enrichment.spec.js` |
| 7 | Officer document annotation (OCR tag/note loop) | 🟡 **amended 1 Aug** (tag + note + tag-facet loop retained; note-clip beat removed per the linguist-bench decision) | `screens/day9-ocr-annotation.png` |

**7 of 7 flows covered — 3 verbatim (1, 3, 4), 4 amended by the logged 1 Aug
linguist-bench decisions** (`hcd/one_output_model.md` and `hcd/bilingual_display_model.md`
record the deviations and the single-commit restoration path; the React reference app and
its suite are untouched and retain the full evaluated behavior). Plus additional
Angular-build specs (shell contract, all five service contracts through the proxy, panel
collapse, queue progress/stack-clear, flash landing, summary widget, always-bilingual
display, multi-page OCR paging, thread-gold end-to-end) — **30 e2e passing**, full run in
`e2e-results-2026-08-01.json`.

**Thread-gold amendment (31 Jul) proven end-to-end**: translate-thread 0/5 → 5/5, five
linguist confirmations → GOLD-READY, promote → THREAD GOLD card with provenance, export
carries the full verdicted transcript, and the queue ticks 1/43 worked
(`screens/day9-thread-gold-promoted.png`, `screens/day9-export-thread-gold.png`).

## Packaging proof (deliverable ② deployability — Platforma checklist)

The `package-validate` CI job proves the six-image set on a kind cluster **on every
push**: image builds (multi-stage, non-root, patched bases) → trivy scan gating on
CRITICAL (caught and fixed two real CVEs during hardening: OpenSSL CVE-2026-31789 in the
Alpine bases, node-tar CVE-2026-59873 via bundled npm — removed from runtime images) →
`kubectl apply -k deploy/k8s` → rollout status on all six Deployments → in-cluster smoke
through the SPA proxy chain (healthz, bundle, search, translate, OCR, static fixture).
First green run: [Actions run 30674534310](https://github.com/Blackfell-Group/imax-chat-viewer/actions/runs/30674534310).
Deployment guide: `../../deploy/README.md`.

## Test runs

| Artifact | What it is |
|---|---|
| `e2e-results-2026-08-01.json` | Full Playwright JSON results, current suite (30 specs) against ng serve + live mocks |
| `e2e-results-2026-07-31.json` | Day-1 snapshot (20 specs), retained for the trail |
| Angular unit tests | 10 specs (app shell contract + wire-format per service), `ng test`, green |
| CI | Every push: lint + prod build + unit + e2e — [Actions history](https://github.com/Blackfell-Group/imax-chat-viewer/actions), PR #15 checks all green |

## Screenshots (`screens/`)

| File | Shows |
|---|---|
| `tour-1-thread-open.png` | Queue + thread open, 0/43 worked baseline |
| `tour-2-working-stack.png` | Dispositions working the stack: flagged stays, reviewed leaves, 3/43 |
| `tour-3-stack-clear.png` | **[31 Jul amendment]** scoped stack worked to empty — explicit done-state |
| `search-1-crosslang.png` | English query matching Arabic via translation, highlight + badge + stats |
| `search-2-watchlist.png` | Flagged-numbers watchlist sweep, entity chips across 3 languages |
| `day6-viewer-rtl-summary.png` | RTL/mixed-script stream + on-demand executive summary |
| `day6-hit-flash-landing.png` | Search hit landing on the evidence message with flash |
| `day9-ocr-annotation.png` | OCR split pane + officer tag/note annotation strip |
| `day9-thread-gold-promoted.png` | **[31 Jul amendment]** thread promoted to gold: verdict badges, THREAD GOLD card, queue ticked |
| `day9-export-thread-gold.png` | Export with the THREAD GOLD full-transcript section |
| `day1-bilingual-review.png` | **[finding #2]** bilingual view: source stays visible under the English, and the correction editor renders against the source (`hcd/bilingual_display_model.md`) |
| `day2-review-states-strip.png` | **[finding #3]** the bench: button-free queue rows, review-state edges, and every thread decision in the workflow strip (`hcd/one_output_model.md`) |
| `day2-queue-only-view.png` | **[finding #3 §5]** find tools collapsed — the queue-only bench (14 rows visible vs 5), and the preview of the search-trimmed build if the Sponsor directs it |

Visual parity baseline vs the evaluated React demo: `../parity/react-shell.png` vs
`../parity/angular-shell.png` (captured day 1, same viewport, same corpus).

## HCD artifacts (deliverable ①)

Complete set in [`../../hcd/`](../../hcd/): personas · empathy maps · annotated wireframes
(persona-indexed, amendment-marked) · **three workflow-model findings** — the unit of gold
is the thread (31 Jul) · no verdict without the source (31 Jul) · a linguist's bench, one
output (1 Aug). Wireframe annotations cross-reference the screenshots above; the set is the
touchpoint-#1 packet (Mon 3 Aug).

## Project artifacts (deliverable ⑤)

`../risk_register.md` (live) · `../burndown.md` (daily) · sprint board = GitHub issues
#1–#18 under the Sprint 1 / Sprint 2 milestones (day tasks + the HCD amendments).
