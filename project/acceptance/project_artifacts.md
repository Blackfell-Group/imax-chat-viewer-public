# Project Artifacts

**TDD data deliverable D5** · Agreement No. 5600002690012
River Hawk Consulting, LLC · UNCLASSIFIED

Sprint-board export, burndown chart and risk register in their final state.
Maintained daily during performance rather than reconstructed at the end.

---

# Sprint Board — Sprint Board Export — final (2026-08-01)

Deliverable ⑤ / TDD **D5** point-in-time export. Live board: GitHub issues, milestones
Sprint 1 / Sprint 2.

**Two calendars, deliberately.** Rows 1–18 are the build sprint River Hawk ran at its own
expense from 30 July, before award. The agreement was executed **6 August** and its period
of performance is **6 – 20 August** (Article II), so the post-award rows carry their real
dates. Nothing has been back-dated to make the two agree.

| # | State | Title | Milestone |
|---|---|---|---|
| 1 | CLOSED | Day 1 — Fri 31 Jul: Kickoff, Angular workspace, CI, board, HCD start | Sprint 1 (31 Jul – 6 Aug) |
| 2 | CLOSED | Day 2 — Sat 1 Aug: HCD artifacts final; typed models + API services | Sprint 1 (31 Jul – 6 Aug) |
| 3 | CLOSED | Day 3 — Sun 2 Aug: App shell + dark theme + signal stores (weekend buffer) | Sprint 1 (31 Jul – 6 Aug) |
| 4 | OPEN | Day 4 — Mon 3 Aug: Offer touchpoint #1 (HCD); triage panel 1 — browse queue | Sprint 1 (31 Jul – 6 Aug) |
| 5 | CLOSED | Day 5 — Tue 4 Aug: Triage panel 2 — search | Sprint 1 (31 Jul – 6 Aug) |
| 6 | CLOSED | Day 6 — Wed 5 Aug: Chat viewer core + summary widget | Sprint 1 (31 Jul – 6 Aug) |
| 7 | OPEN | Day 7 — Thu 6 Aug: Buffer + Sprint 1 review | Sprint 1 (31 Jul – 6 Aug) |
| 8 | CLOSED | Day 8 — Fri 7 Aug: Message bubble enrichment | Sprint 2 (7 – 13 Aug) |
| 9 | CLOSED | Day 9 — Sat 8 Aug: OCR dialog + officer annotation + gold copy + export | Sprint 2 (7 – 13 Aug) |
| 10 | OPEN | Day 10 — Sun 9 Aug: Feature complete; full Playwright suite green (weekend buffer) | Sprint 2 (7 – 13 Aug) |
| 11 | CLOSED | Day 11 — Mon 10 Aug: Touchpoint #2; Platforma packaging | Sprint 2 (7 – 13 Aug) |
| 12 | CLOSED | Day 12 — Tue 11 Aug: User guide + developer guide; fix touchpoint findings | Sprint 2 (7 – 13 Aug) |
| 13 | OPEN | Day 13 — Wed 12 Aug: Acceptance package | Sprint 2 (7 – 13 Aug) |
| 14 | OPEN | Day 14 — Thu 13 Aug: Freeze + deliver | Sprint 2 (7 – 13 Aug) |
| 16 | CLOSED | Thread-level gold copy (31 Jul HCD scope amendment) | Sprint 2 (7 – 13 Aug) |
| 18 | CLOSED | Bilingual display (31 Jul HCD finding #2): source always visible with translation | Sprint 1 (31 Jul – 6 Aug) |
| 19 | CLOSED | 7 Aug — Executed OT audited clause by clause against the repository; `signed_ot_audit.md` | Post-award (6 – 20 Aug) |
| 20 | CLOSED | 7 Aug — Virtualized message stream (TDD 3.3) + <200 ms latency verification (TDD Task 5) | Post-award (6 – 20 Aug) |
| 21 | CLOSED | 7 Aug — Twelve defects from internal review closed, each with a specification | Post-award (6 – 20 Aug) |
| 22 | CLOSED | 7 Aug — RTL scan rendering fixed; attachments serve rasters so the enclave needs no Arabic/CJK fonts | Post-award (6 – 20 Aug) |
| 23 | CLOSED | 7 Aug — Five-page Arabic customs declaration added to the corpus (55 OCR blocks) | Post-award (6 – 20 Aug) |
| 24 | CLOSED | 7 Aug — Period of performance corrected across the package; milestone record and D1–D6 crosswalk written | Post-award (6 – 20 Aug) |
| 25 | CLOSED | 7 Aug — D3 test-results report and D5 PDF/CSV produced; architecture deliverable written (Article XII) | Post-award (6 – 20 Aug) |
| 26 | OPEN | Public mirror rebuilt code-only; AO letter sent (publicity, Angular direction, Attachments 2 & 3) | Post-award (6 – 20 Aug) |
| 27 | OPEN | Walkthrough re-recorded against the fixed build and narrated | Post-award (6 – 20 Aug) |
| 28 | OPEN | **M5 — Thu 20 Aug: package transmitted, live demonstration in person** | Post-award (6 – 20 Aug) |

---

# Burndown — IMAX Chat-Viewer Prototype OT (Phase 3)

**Deliverable ⑤ component — one row added per day at standup; chart exported day 13–14.**
Baseline: **20.0 person-days** — 19.0 per the Phase 3 component inventory effort model
(build 14.0 + HCD 2.0 + guides 1.5 + acceptance package 1.5) **+1.0 scope amendment 31 Jul**
(thread-level gold copy, HCD-driven; see `../hcd/linguist_workflow_model.md`).

| Day | Date | Planned remaining (pd) | Actual remaining (pd) | Notes |
|---|---|---|---|---|
| 0 | Thu 30 Jul | 19.0 | 19.0 | Baseline |
| 1 | Fri 31 Jul | 17.5 | 2.5 | Feature-complete + packaged + documented, day 1: all 7 acceptance specs green (26 e2e); six-image set proven on a kind cluster in CI (trivy gate caught 2 real CVEs during hardening); user + developer + deployment guides in docs/ and deploy/. Remaining: acceptance package (walkthrough recording, deck, exports — 1.5) + polish/screenshot parity specs (1.0) |
| 2 | Sat 1 Aug | 16.0 | **0.0** | **PACKAGE FROZEN** — multi-page Russian document + OCR paging; three HCD design passes (linguist bench, always-bilingual, button-free stack, collapsible find tools); guide/deck PDFs rendered; final board export; DELIVERY.md manifest; tag v1.0.0-prototype. 32 e2e green | |
| 3 | Sun 2 Aug | 14.5 | 0.0 | Delivered; remaining days are reaction time |
| 4 | Mon 3 Aug | 13.0 | | **Early-delivery email + walkthrough video to Sponsor; feedback requested by Fri 7 Aug** |
| 5 | Tue 4 Aug | 11.5 | | |
| 6 | Wed 5 Aug | 10.0 | | |
| 7 | Thu 6 Aug | 9.0 | | Sprint 1 review |
| 8 | Fri 7 Aug | 7.5 | | |
| 9 | Sat 8 Aug | 6.0 | | |
| 10 | Sun 9 Aug | 5.0 | | Weekend buffer; feature complete |
| 11 | Mon 10 Aug | 3.5 | | Touchpoint #2; packaging |
| 12 | Tue 11 Aug | 2.0 | | **Effective last working day (team unavailable from 12 Aug)** — final adjustments must land here |
| 13 | Wed 12 Aug | 1.0 | | |
| 14 | Thu 13 Aug | 0.0 | | Original pre-award plan ends here |

## Post-award period — 6 to 20 August (Article II)

The agreement was executed 6 August, after the build was complete. The chart above tracks
the pre-award build sprint; this one tracks the work the period of performance actually
paid for. Day 1 is 7 August per TDD Assumption (1).

| Day | Date | Planned remaining (pd) | Actual remaining (pd) | Notes |
|---|---|---|---|---|
| 1 | Fri 7 Aug | 6.0 | 3.0 | Executed OT audited clause by clause; twelve review defects closed; virtualized stream + latency verification (TDD 3.3 / Task 5); RTL scans fixed; five-page Arabic customs document added; period of performance corrected; milestone record, D1–D6 crosswalk, D3 report and D5 PDF/CSV produced. 49 e2e green |
| 2 | Sat 8 Aug | 5.0 | 2.0 | Internal review round 2 (Tyla, both cuts): Gold Copy export dialog overflowed its own border and maximize was capped — both fixed and regression-tested; walkthrough re-captured and re-narrated to remove a jarring un-maximize before close, and the capture now records the clipboard success path the narration describes. The webm→mp4 step the pipeline had always required by hand is scripted. Targeting direction taken same day: a standing channel is worked whole, so the corpus gained a 2,388-message thread kept unsegmented (virtualization is now proven against real data, not a synthetic thread), plus a conversation-level note that leads the gold copy, a bulk accept recorded distinctly from line-by-line confirmation, and line-by-line bilingual OCR carried on the gateway contract rather than only in fixtures. 66 e2e green |
| 3 | Sun 9 Aug | 4.5 | | Buffer |
| 4 | **Mon 10 Aug** | 4.0 | | **M2 — Platforma deployment evidence due** |
| 7 | Thu 13 Aug | 3.0 | | M3; touchpoint #2 offered |
| 11 | Mon 17 Aug | 1.5 | | M4; touchpoint #3 offered |
| 13 | Wed 19 Aug | 0.5 | | **Freeze + dry run** |
| 14 | **Thu 20 Aug** | 0.0 | | **M5 — package transmitted, live demonstration in person** |

> **Availability risk.** The pre-award plan recorded 12 August as the team's effective last
> working day. The period of performance now runs to 20 August and M5 requires a live
> demonstration on that date. This is carried as an open risk in the register rather than
> assumed away.

---

# Risk Register — IMAX Chat-Viewer Prototype OT (Phase 3)

**Deliverable ⑤ component — maintained live, touched daily at standup.**
UNCLASSIFIED — Period of performance: **6 – 20 August 2026** per Article II of the
executed agreement. Dates below are the calendar dates work was actually done; the
SPA build predates award.

| # | Risk | Likelihood × Impact | Mitigation | Status | Last touched |
|---|---|---|---|---|---|
| 1 | Sponsor silent on kickoff questions (Angular version, sandbox access, deployment posture) | H×M | Day-1 kickoff email states assumptions (Angular v21 LTS pinned; deliver-deployable) and that we proceed on them unless directed otherwise; follow-up phone call to Sponsor POC | **Open** — email SENT 31 Jul, no response yet; follow-up call to POC still recommended | 1 Aug |
| 2 | Platforma sandbox access arrives late or not at all — **and integration problems there are unknowable until it exists** | H×H | Deliver-deployable posture validated on a kind cluster in CI on every push (build → scan → deploy → in-cluster smoke), so the artifact set is proven independent of Platforma. Finishing the build early preserves 10 days of reaction time if access arrives and surfaces integration work. **Until it runs in Platforma the work is not represented as delivered** | Open — **the reason for finishing early** | 1 Aug |
| 3 | Angular v21 pin differs from Platforma's enterprise baseline | M×M | v21 is LTS; no APIs newer than v17 anywhere; adjacent-major `ng update` in either direction is small; pin stated in kickoff email | Open | 1 Aug |
| 4 | 3-person team, 19 person-days, no slack for illness | M×H | Weekend buffer days 3 (Sun 2 Aug) and 10 (Sun 9 Aug); pre-agreed trim order: screenshot specs → extra specs → ~~virtual scroll~~ → collapse polish. **Virtual scroll was trimmed under this order and reinstated 7 Aug** — the TDD commits to it (3.3) and to verifying a latency budget against it (Task 5), so it was not ours to trim. Core triage/enrichment/gold-copy flow never trimmed | Open | 1 Aug |
| 5 | Sponsor touchpoint feedback expands scope | M×M | Touchpoints framed as validation, not redesign; changes beyond parity logged as open issues in the acceptance deck | Open | 1 Aug |
| 6 | **Mock-data realism** — fixtures that do not look like collection produce design decisions that do not survive contact with real traffic | M×M | Corpus is 46 threads (largest 2,388 messages) across four languages and three ingest lanes, with chatter deliberately mixed in so the enrichment surface is not uniformly interesting; documents are real forms, not cards. **Closed by outcome 7 Aug**: the largest document was 19 short blocks, which flattered the OCR viewer; a five-page Arabic customs declaration with a tabular manifest replaced that assumption | **Closed** | 7 Aug |
| 7 | **Enrichment-service contract drift** — mock JSON diverging from what the production services actually return, so cutover becomes a rewrite | M×H | Contracts are schema-pinned and frozen; the client reads them through typed models (`core/models/api.models.ts`) and six service wrappers, so a drift shows up as a type error rather than a runtime surprise. `services.spec.js` asserts the wire format independently of the UI | Open — unverifiable until the live services are reachable | 7 Aug |
| 8 | **Team availability against the post-award calendar** — the pre-award plan recorded 12 August as the effective last working day; the period of performance runs to 20 August and M5 requires a live demonstration on that date | M×H | Everything except the demonstration itself lands by the 19 August freeze, so the 20th needs presence rather than production | **Closed 7 Aug** — the 20 August demonstration is scheduled, in person | 7 Aug |

**Status at freeze (1 Aug):** risks 1–3 remain open and are carried into the delivery
manifest's open-items list (Sponsor silence, sandbox access, Angular baseline). Risks 4
and 5 are closed by outcome: the build completed 12 days inside the window, and Sponsor
touchpoint feedback can still be absorbed within the remaining period of performance.

## Closed / resolved

| # | Risk | Resolution |
|---|---|---|
| R1 | Start-date ambiguity (signature vs kickoff) | Clock confirmed started 31 July; delivery 13 August |
| R2 | Offline npm build required in sandbox | Sandbox provides an npm registry |
