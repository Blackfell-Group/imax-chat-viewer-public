# IMAX Chat-Viewer Prototype OT — Acceptance Deck (DRAFT for internal feedback)

**River Hawk Consulting, LLC** · UNCLASSIFIED // Proprietary
Period of performance: **6 – 20 August 2026** (executed 6 August) · SPA build complete
1 August, ahead of award (`v1.0.0-prototype`)
Current package: **`v1.1.0-prototype`** — adds the Platforma environment work and completes Deliverable ①
*For review and direction — not a delivery transmittal. The prototype has not run in
Platforma; sandbox access has not been granted.*

---

## 1. Objectives (from the solicitation)

| Deliverable | Objective | Status |
|---|---|---|
| ① HCD artifacts | Personas, empathy maps, wireframes grounding the design | ✅ complete + **three** workflow-model findings |
| ② Angular SPA codebase | The evaluated chat-viewer, rebuilt in Angular, in GitHub | ✅ feature-complete on `main` |
| ③ e2e smoke tests | The Phase 2 acceptance suite against the new build | ✅ 7/7 flows covered (3 verbatim, 4 amended) + 25 more |
| ④ User + developer guides | Workflow-organized and architecture docs | ✅ complete, PDFs in `project/delivery/` |
| ⑤ Sprint artifacts | Board, burndown, risk register — worked live | ✅ maintained daily, final exports at freeze |
| ⑥ Demo & acceptance package | Recorded walkthrough, this deck, exports | 🟡 this draft |

## 2. What was built

- **Angular 21 (LTS, pinned)** SPA at `angular/` — standalone components, signals, typed
  contracts against the frozen mock services. The React demo remains in-repo as the
  reference implementation; `data-testid`s carry 1:1, which is the acceptance mechanism.
- **Full evaluated workflow**: triage queue with My-languages scope and thread-level
  dispositions;
  corpus-wide 4-language search (content + entity/selector modes, facets, geo-fence and
  watchlist groups, date range); jump-to-evidence with flash; translate-in-place with
  linguist review verdicts; entity chips; analyst notes; OCR viewer with officer
  annotation and the tag-facet loop-back; gold-copy tray with provenance and standardized
  export.
- **Three HCD findings (Sponsor validation pending — see the demo's before/after
  segments)**:
  1. *The unit of gold is the whole thread* — translate-thread, gold-ready meter,
     promote-to-gold (full verdicted transcript), and the queue's N-of-M/stack-clear
     affordances (`hcd/linguist_workflow_model.md`).
  2. *No verdict without the source* — always bilingual (English leads, original stays
     on screen, direction-correct); corrections are written against the source
     (`hcd/bilingual_display_model.md`).
  3. *A linguist's bench, one output* — one gold action, thread-level enrichment, a
     button-free stack, collapsible find tools (`hcd/one_output_model.md`). **This one
     removes evaluated behavior** (snippet clipping); the React reference build is
     retained and the removal reverts in a single commit.
- **Platforma packaging**: six images (unprivileged nginx SPA + five single-responsibility
  service pods), kustomize manifests with probes/limits/non-root, no secrets, stateless.
  Proven on a kind cluster in CI on every push (build → trivy CRITICAL gate → deploy →
  rollout → in-cluster smoke).

## 3. Test results (evidence: `project/evidence/`)

| Suite | Result |
|---|---|
| Ported Phase 2 acceptance flows | **7 of 7 covered** — 3 verbatim, 4 amended by logged HCD decisions |
| Total e2e (Playwright, vs live mocks) | **32 green** (JSON results in evidence) |
| Angular unit tests (wire-format + shell) | 10 green |
| CI | lint · prod build · unit · e2e · package-validate — green on `main` |
| Security gate | trivy caught 2 real CRITICALs during hardening; both fixed; gate green |
| Requirements compliance | Every solicitation requirement scored — `requirements_compliance.md` |

## 4. Open issues (contractually honest — deliverable ⑥ expects these)

1. **Sponsor unresponsive since kickoff** — proceeding on stated assumptions (Angular v21
   LTS; deliver-deployable). Escalation: kickoff email sent 31 Jul + phone follow-up.
2. **Thread-gold amendment awaits Sponsor validation** (touchpoint #1, Mon 3 Aug).
   Removable without touching evaluated behavior if strict parity is preferred.
3. **Platforma sandbox access not granted** — validation is on kind in CI (the agreed
   fallback); sandbox deployment is a same-day exercise once credentials arrive.
4. **Demo narration is complete** — the walkthrough was re-captured on 7 August against the
   fixed build and narrated (4:08). The synthesized scratch track is superseded. Script,
   narration text, capture pipeline and build are all in the repository, so the recording is
   reproducible rather than a one-off.
5. **Live model gateway is wired but unproven against the enclave** — configuration-only
   switch (`deploy/README.md` §4); cannot be exercised without access.
6. **Screenshot-diff specs** intentionally trimmed per the pre-agreed scope-trim order;
   parity is evidenced by side-by-side captures instead.
7. **1 Aug design decisions (owner-directed, logged in the HCD artifacts)** — the
   defining one: **this application is a linguist's bench** (`hcd/one_output_model.md`).
   Translations render by default (bilingual; frontier-LLM retranslation is the named
   production seam); review state as colored message edges; ONE output — promoted
   thread gold (snippet evidence clips removed; analyst notes travel into the gold
   transcript); enrichment is thread-level, run once (translate + entity extraction);
   queue offers only *reviewed* — flag/discard live in the viewer strip; gold pane
   slimmed. Acceptance posture: specs 1/3/4/5 verbatim, 2/6/7 amended with the beats
   retained where behavior survives; React reference app untouched; single-commit
   restoration path if the Sponsor requires strict parity. A multi-page Russian
   document (3-page storage contract) was added to the corpus with OCR page navigation.

## 4a. How to watch the demo

Two cuts ship, and only two:

- **`RiverHawk_IMAX_Walkthrough_2026-08-07.mp4`** (4:05, narrated) — the working product end
  to end, with each design finding explained where it shows on screen: why the unit of gold
  is the whole thread, why translations are always bilingual, why the queue asks one
  question. Watch this one.
- **`RiverHawk_IMAX_Walkthrough_2026-08-07_capability.mp4`** (3:49) — the same footage
  without the design derivation, for audiences who want the capability and not the
  reasoning.

Both are reproducible rather than one-offs: `narration.json` /
`narration.capability.json` carry the script, `scripts/capture-walkthrough.js` drives the
capture, and `scripts/build-walkthrough.sh` builds either cut.

## 5. Ask of reviewers (this draft)

- Does the thread-gold flow read as *the* linguist workflow, or does anything about the
  meter/promote/stack semantics feel off? (This is the HCD story for touchpoint #1.)
- Bilingual view: is English-leads-source-beneath the right hierarchy, or would a
  side-by-side split serve the linguist better? (Finding #2 — shown as before/after in
  the demo and in `../evidence/screens/day1-bilingual-review.png`.)
- Finding #3 removes snippet clipping. Is the reasoning persuasive, or should the
  evaluated behavior be restored?
- Any gaps between the demo and how you'd present this to the Sponsor?
- Deck/guide tone: anything that reads as overclaiming or underclaiming?
