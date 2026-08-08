# Milestone Accomplishment Record

**Agreement No. 5600002690012** · River Hawk Consulting, LLC · UNCLASSIFIED
Period of performance: **6 – 20 August 2026** (Article II)

Submitted under **Article VIII(b)**: *"Attachment 2 provides the mutually agreed-to
acceptance criteria for each milestone. The Performer shall document for acceptance by the
Government, the accomplishments of each milestone and shall submit such documentation to
the AOR and AO for approval."*

> **Attachment 2 was not included in the executed agreement.** The body references it four
> times (Article VIII(b) twice, Article XII once) but the LIST OF ATTACHMENTS names only
> Attachment 1. In its absence, the milestones and success indicators scored below are
> taken from the **TDD's own Milestones / Success Indicators table**, which is Attachment 1
> and therefore incorporated. River Hawk has requested Attachment 2 from the AO and will
> re-score against it on receipt if it differs. See `signed_ot_audit.md` §2.3.

## Calendar

TDD Assumption (1): *"Day 1 begins the first calendar day after agreement execution."*
The agreement was executed **6 August 2026**, so Day 1 is **7 August** and Day 14 is
**20 August**, consistent with Article II.

| Milestone | Day | Date | Status |
|---|---|---|---|
| M1 — proto-personas, empathy maps, task flows | 2 | Sat 8 Aug | ✅ complete |
| M2 — repo scaffolded; five mock services containerized and smoke-deployed | 4 | Mon 10 Aug | 🟡 see below |
| M3 — full wireframe set validated and frozen as build baseline | 7 | Thu 13 Aug | ✅ complete |
| M4 — feature-complete UI wired to mock services; smoke suite passing | 11 | Mon 17 Aug | ✅ complete |
| M5 — all six data deliverables transmitted; live demonstration provided | 14 | **Thu 20 Aug** | ⏳ scheduled |

River Hawk developed the demonstration software **at its own expense before award**
(TDD, IP Assertion). The period of performance therefore opened with the build already
complete, and M1, M3 and M4 were satisfied by work predating their nominal dates. This is
stated plainly rather than presented as early delivery: the Government is receiving the
benefit of pre-award investment, which is what the TDD said it would.

---

## M1 — Proto-personas & empathy maps · Day 2

**Success indicator (TDD):** *"Two proto-personas with empathy maps and task flows delivered
for Sponsor review."*
**Verification (TDD):** *"Artifacts in repo (optional Touchpoint 1 offered ~Day 3)."*

| Evidence | Where |
|---|---|
| Four personas — two required, two secondary | `hcd/personas.md` |
| Empathy maps (Says / Thinks / Does / Feels) | `hcd/empathy_maps.md` |
| Four task flows and the end-to-end journey map | `hcd/journey_map.md` |
| 20 per-persona success criteria, each naming the specification that replays it | `hcd/journey_map.md` |

**Delivered as** `project/delivery/hcd_artifacts.pdf`. Exceeds the indicator: two personas
were required, four are delivered.

Touchpoint 1 was offered and remains offered; the Sponsor has not scheduled it.

## M2 — Repo, containerized services, sandbox smoke deployment · Day 4

**Success indicator (TDD):** *"GitHub repo scaffolded; all five mock services containerized
and smoke-deployed to Platforma (or matched local K8s if sandbox access is pending)."*
**Verification (TDD):** *"Deployment log; running pods; repo access."*

> **The TDD wrote this verification assuming direct cluster access.** The target environment
> is driven by **ArgoCD**, and River Hawk has no `kubectl` against it — deployment is a
> declarative sync, not a command someone runs. The equivalent evidence, and what should be
> captured instead, is:
>
> | TDD wording | ArgoCD equivalent |
> |---|---|
> | Deployment log | The Application's sync history — revision, sync result, timestamp |
> | Running pods | The Application's health status and resource tree, showing all six workloads `Healthy` |
> | Repo access | The Application's source repository and target revision |
>
> A single `argocd app get imax -o yaml` captures all three, or a screenshot of the
> Application view if only the UI is reachable. This is the same evidence in the form the
> environment actually produces it, and the Helm chart at `deploy/chart/` is what ArgoCD
> consumes.
>
> **[`m2_evidence_checklist.md`](m2_evidence_checklist.md)** is the working copy for
> capturing it: the command, what a good result looks like, what each likely failure means,
> and what to do with a partial result.

| Evidence | Where |
|---|---|
| GitHub repository, CI on every push | `Blackfell-Group/imax-chat-viewer` |
| Five schema-pinned mock services | `routes/`, `deploy/k8s/mock-*.yaml` |
| Dockerfiles and Kubernetes manifests | `deploy/Dockerfile.{spa,mock}`, `deploy/k8s/` |
| Helm chart for ArgoCD, proven equivalent to the manifests | `deploy/chart/`, `scripts/compare-chart-kustomize.py` |
| Six-image set built, scanned (trivy CRITICAL gate), deployed to a cluster and smoked — every push | `.github/workflows/angular-ci.yml` |
| Pod sizing within the TDD's 0.5 vCPU / 512 MB ceiling | 250m CPU / 256Mi memory on all six |

**Status 🟡.** The TDD's stated fallback — *"matched local K8s if sandbox access is
pending"* — is satisfied continuously and mechanically: CI re-proves the full chain on
every push. Platforma sandbox access was not granted during the period.

**A Platforma build has since been reported by River Hawk's own team.** It is *not* scored
here yet, because none of the equivalent evidence above has been captured. This row is
completed by attaching an `argocd app get` output or the Application view; until then the
documented fallback is what is claimed.

## M3 — Wireframes validated and frozen · Day 7

**Success indicator (TDD):** *"Full wireframe set validated with Sponsor input and frozen as
build baseline."*
**Verification (TDD):** *"Baselined wireframes; internal approval record (optional
Touchpoint 2)."*

| Evidence | Where |
|---|---|
| Persona-indexed annotated wireframes, every prototype screen | `hcd/wireframes.md` |
| Pain-to-design traceability: 24 pains → response → screen → specification → screenshot | `hcd/traceability_matrix.md` |
| Assumption log, 16 entries, 6 closed | `hcd/assumption_log.md` |
| Three workflow-model findings with rationale and restoration paths | `hcd/linguist_workflow_model.md`, `hcd/bilingual_display_model.md`, `hcd/one_output_model.md` |

**Sponsor input was not available.** Wireframes were validated against the documented
assumption log — the fallback the TDD states for exactly this case — and every assumption
is flagged for Sponsor review in the acceptance package. Touchpoint 2 remains offered.

## M4 — Feature-complete UI, green smoke suite · Day 11

**Success indicator (TDD):** *"Feature-complete UI wired to mock services; smoke suite
passing on the full mission loop."*
**Verification (TDD):** *"Green Playwright run; build demo (optional Touchpoint 3)."*

| Evidence | Where |
|---|---|
| Every wireframed screen implemented | `angular/src/app/features/` |
| Full mission loop: queue → search → thread → bilingual review → enrichment → OCR → promote to gold → export | `tests/ng/` |
| **68 e2e specs green**, plus 10 Angular unit and 62 Node unit specs | `npm run test:ng`, `npm test --prefix angular`, `npm run test:node` |
| Ported Phase 2 acceptance flows: 7 of 7 covered — 3 verbatim, 4 amended by logged HCD decisions | `project/evidence/README.md` |
| Machine-readable results | `project/evidence/e2e-results-*.json` |

**TDD Task 5 performance target verified.** The TDD commits QA to *"<200 ms interaction
latency on large logs via virtualization."* `tests/ng/virtual-scroll.spec.js` synthesizes a
2,000-message thread, asserts the DOM holds a bounded window, and measures worst
scroll-to-repaint at **~17 ms**. This was previously unverified and the virtualization
itself was previously absent; both were found and closed by the 7 August audit.

**Twelve defects from internal review** were closed on 7 August, each with a specification:
resizable panels; a resizable, maximizable and zoomable scan viewer; session-wide document
tags with an explicit Add control; right-to-left scan rendering; chronological message
ordering with an ASC/DESC toggle; copy confirmation with a working manual fallback; a
flagged-for-targeter facet and sort; a larger resizable export dialog; drag-reorderable
gold copy that the export follows; and a retractable review verdict. Logged as QA in the
board export and burndown — **not** claimed as Sponsor validation.

## M5 — Acceptance package and live demonstration · Day 14

**Success indicator (TDD):** *"All six data deliverables transmitted; live demonstration
provided."*
**Verification (TDD):** *"Acceptance package receipt."*

⏳ **Scheduled for Thursday 20 August 2026, in person.** Transmittal and demonstration are
both required; neither substitutes for the other.

---

## Data deliverables — TDD D1–D6 crosswalk

The TDD names six data deliverables with formats and due days. This is the mapping the
Government should use for acceptance.

| ID | Deliverable | Format required | Due | Artifact | Status |
|---|---|---|---|---|---|
| **D1** | HCD Artifacts — personas, empathy maps, task flows/journey map, full wireframe set, assumption log, pain-to-design traceability matrix | PDF + source | D2 / D7 / D14 | `hcd/` (source) · `project/delivery/hcd_artifacts.pdf` | ✅ |
| **D2** | UI Codebase — SPA implementing all HCD screens; Dockerfiles and Kubernetes charts for SPA and mock services; GitHub repository | Git repo | D4, then continuous | `angular/`, `deploy/` on `main`; `Blackfell-Group/imax-chat-viewer` | ✅ |
| **D3** | Test Suite — Playwright end-to-end smoke tests, test scripts, and final results report | In repo + PDF | D11 / D14 | `tests/` (source) · `project/acceptance/test_results.md` · `project/delivery/test_results.pdf` | ✅ |
| **D4** | Documentation — user guide and developer guide, including production cutover path | PDF | D14 | `docs/` · `project/delivery/{user_guide,developer_guide,deployment_guide,architecture}.pdf` | ✅ |
| **D5** | Project Artifacts — sprint-board export, burndown chart, risk register (final state) | PDF / CSV | D14 | `project/delivery/project_artifacts.pdf` · `project/delivery/board_export_final.csv` | ✅ |
| **D6** | Demo & Acceptance Package — recorded walkthrough (Sponsor receives unlimited rights), summary slide deck (objectives, test results, open issues), live demonstration | MP4 / PDF + live | D14 | `project/acceptance/*.mp4` · `project/delivery/acceptance_deck.pdf` · live demo 20 Aug | 🟡 narration re-recording; live demo scheduled |

**Beyond D4.** Article XII requires *"the architecture the Performer will deliver prior to
the end of the period of performance"*, against the Article I(b) definition — sufficient
*"to enable the Government to implement the system without requiring further development or
support from the Performer."* Delivered as `docs/architecture.md` /
`project/delivery/architecture.pdf`. This is an Article XII obligation the TDD's D1–D6 list
does not name; it was missed until the 7 August audit.

## Administrative deliverables

Required by the agreement, outside the TDD's D1–D6.

| Requirement | Article | Due | Status |
|---|---|---|---|
| FOCI package — SF 328, Key Management Personnel list, Organizational Entity Structure | XIV(c) | Not stated | ⏳ disposition requested from the AO |
| Cleared Personnel Certification Report (Attachment 3 template) | XV(n) | 30 September annually | ⏳ disposition requested; expected nil return |
| Cleared Personnel Disposition Report (Attachment 3 template) | XV(o) | Within 60 days of completion (~19 Oct 2026) | ⏳ disposition requested; expected nil return |

Article XV(a) scopes the security article to *"the extent that this Agreement involves
access to national security information."* All work is unclassified and no personnel are
cleared under this agreement, so these are expected to be nil returns — but a nil return is
still a return, and the AO should confirm rather than River Hawk assume.
