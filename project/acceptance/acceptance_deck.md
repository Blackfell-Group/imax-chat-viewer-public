# IMAX Chat-Viewer Prototype OT — Acceptance Deck

**River Hawk Consulting, LLC** · UNCLASSIFIED // Proprietary
Period of performance: **6 – 20 August 2026** (executed 6 August) · SPA build complete
1 August, ahead of award (`v1.0.0-prototype`)
Current package: **`v1.3.0-prototype`** — the delivered acceptance package
*Transmitted for acceptance at M5. The prototype has been deployed and run in Platforma;
the ArgoCD capture evidencing it is attached to the high-side repository, which is where it
is producible.*

---

## 1. Objectives (from the solicitation)

| Deliverable | Objective | Status |
|---|---|---|
| ① HCD artifacts | Personas, empathy maps, wireframes grounding the design | ✅ complete + **three** workflow-model findings |
| ② Angular SPA codebase | The evaluated chat-viewer, rebuilt in Angular, in GitHub | ✅ feature-complete on `main` |
| ③ e2e smoke tests | The Phase 2 acceptance suite against the new build | ✅ 7/7 flows covered (3 verbatim, 4 amended); 72 e2e specs in total |
| ④ User + developer guides | Workflow-organized and architecture docs | ✅ complete, PDFs in `project/delivery/` |
| ⑤ Sprint artifacts | Board, burndown, risk register — worked live | ✅ maintained daily, final exports at freeze |
| ⑥ Demo & acceptance package | Recorded walkthrough, this deck, exports | ✅ complete |

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
| Total e2e (Playwright, vs live mocks) | **72 green** (JSON results in evidence) |
| Angular unit tests (wire-format + shell) | 10 green |
| Node unit tests (identity, certificates, OCR fixtures, model gateway, route smoke) | 93 green |
| Interaction latency at volume | ~17 ms worst scroll-to-repaint against the TDD's 200 ms budget, measured on the 2,388-message standing channel |
| CI | lint · prod build · unit · e2e · package-validate — green on `main` |
| Security gate | trivy caught 2 real CRITICALs during hardening; both fixed; gate green |
| Requirements compliance | Every solicitation requirement scored — `requirements_compliance.md` |

## 4. Open issues

Stated rather than smoothed. Nothing here blocks acceptance of the delivered artifacts;
each is either Government-side, environment-dependent, or a scope boundary that was
decided deliberately and is recorded where the decision was made.

**Government-side or environment-dependent**

- **Deployment evidence (M2) lives high-side.** The application is delivered as a deployable
  image set with an ArgoCD Application manifest and a Helm chart / kustomize pair proven
  equivalent in CI, and it has been deployed and run in Platforma. The sync, health and
  resource-tree record is generated inside the enclave, so it is attached to the high-side
  repository rather than to this package — River Hawk has no low-side path to carry it.
- **A live model gateway is built beyond the requirement**, and has not been called from
  inside the enclave. The solicitation accepts containerized mock services that emulate
  production, and the five schema-pinned services satisfy it; the gateway path is capability
  added on top. Translation, entity extraction, summarization and OCR are fixture-backed by
  default and gateway-backed by configuration —
  `MODEL_ENDPOINT`, `MODEL_NAME` and `MODEL_API_KEY` only, no client rework. The client side
  is proven: the provider was run against a real OpenAI-compatible model and the wire-format
  differences a stub cannot surface were found and handled (`max_tokens` vs
  `max_completion_tokens`; reasoning models rejecting `temperature`), both negotiated at pod
  startup. What remains is pointing it at the in-enclave endpoint. Carried as risk 7.
- **Administrative deliverables.** Disposition of the FOCI package (Article XIV(c)) and the
  Cleared Personnel Certification and Disposition Reports (Article XV(n)/(o)) is for the
  Agreements Officer to confirm. All work is unclassified and no personnel are cleared under
  this agreement, so nil returns are expected — but a nil return is still a return.

**Scope boundaries, decided and recorded**

- **No media-query breakpoints.** The layout is fluid, the panels resize and collapse, and
  the scan viewer maximizes — but the build targets the analyst desktop it was evaluated on.
  Small-screen breakpoints were not in scope and are not claimed.
- **No client-side persistence.** Panel widths, sort order, verdicts, notes and tags live in
  memory and reset on reload, per TDD Task 3. `SessionStore` is the seam if production
  requires otherwise.
- **Snippet evidence clips were removed** on 1 August by HCD finding #3
  (`hcd/one_output_model.md`), which found two competing output paths for one user. The
  reasoning and a single-commit restoration path are both recorded; the React reference
  build at `src/` retains the evaluated behaviour unchanged.

**Delivered on the day**

- **The live demonstration** is provided in person on 20 August. The narrated walkthrough is
  delivered alongside it as the standing record and as the fallback if enclave access is
  unavailable on the day.

## 5. How to watch the demo

One recording, which is the deliverable:

**`RiverHawk_IMAX_Walkthrough_2026-08-08.mp4`** (4:51, narrated) — the working product end
to end, with each design finding explained where it shows on screen: why the unit of gold is
the whole thread, why translations are always bilingual, why the queue asks one question.

It is reproducible rather than a one-off: `narration.json` carries the script,
`scripts/capture-walkthrough.js` drives the capture, and `scripts/build-walkthrough.sh`
assembles it.
