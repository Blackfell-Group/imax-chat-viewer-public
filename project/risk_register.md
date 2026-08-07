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
| 6 | **Mock-data realism** — fixtures that do not look like collection produce design decisions that do not survive contact with real traffic | M×M | Corpus is 45 threads across four languages and three ingest lanes, with chatter deliberately mixed in so the enrichment surface is not uniformly interesting; documents are real forms, not cards. **Closed by outcome 7 Aug**: the largest document was 19 short blocks, which flattered the OCR viewer; a five-page Arabic customs declaration with a tabular manifest replaced that assumption | **Closed** | 7 Aug |
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
