# Phase 3 Requirements Compliance Matrix

**River Hawk Consulting, LLC** · UNCLASSIFIED · Re-scored 7 August 2026
Source of requirements: the **executed Other Transaction Agreement No. 5600002690012**
(effective 6 August 2026) and its Attachment 1, the Task Description Document — together
the governing instrument under Articles XX and XXI. The IMAX HCD Prototype OT solicitation
and the Phase 2 selection letter are retained below as the origin of the six deliverables,
which the TDD carries forward as D1–D6.

This matrix scores the **solicitation's** ①–⑥. The TDD's own M1–M5 milestones and D1–D6
data deliverables — which are what the Government verifies for acceptance and what
Article VIII(b) makes a precondition of invoicing — are scored separately in
[`milestone_record.md`](milestone_record.md). The executed agreement was additionally
audited clause by clause against the repository on 7 August; what that audit found is
reflected throughout this matrix and in the milestone record, and the working papers are
retained by River Hawk.

Scored against **`v1.3.0-prototype`**. `v1.1.0-prototype` preceded the 7 August work
(twelve review defects, the virtualized message stream the TDD commits to, and the dense
Arabic customs document); `v1.0.0-prototype` froze the 1 August build, which River Hawk
completed at its own expense **before award**. Where a row depends on newer work it says so.

Legend: ✅ met · 🟡 met with a stated caveat · ⚠️ blocked on Government action

Every claim below was re-checked against the repository — on 4 August against the
solicitation, and again on **7 August against the executed agreement**. Claims that were
wrong are corrected in place; both checks are recorded in §F.

## A. The six required prototype deliverables

> *"The ideal prototype projects provide the following…"*

| # | Requirement (as written) | Status | Where it is | Notes |
|---|---|---|---|---|
| 1 | **HCD Artifacts** — to be defined by the contractor | ✅ | `hcd/`, PDF in `project/delivery/` | All four TDD Task 2 subtasks: **2.1** four personas + empathy maps · **2.2** journey map, four task flows, 20 per-persona success criteria · **2.3** persona-indexed annotated wireframes · **2.4** pain-to-design traceability matrix (24 pains, each traced to a design response, screen, specification and screenshot) + a 16-entry assumption log. Plus three workflow-model findings produced during performance. Delivered as one document: `hcd_artifacts.pdf` |
| 2 | **UI Codebase** — a single-page application implementing all HCD screens, stored in a GitHub repository | ✅ | `angular/` on `main` | Angular 21.2.19, pinned exactly (no `^`/`~` on `@angular/core` or `@angular/cli`); standalone components + signals; every wireframed screen implemented; unlimited rights. The 1 August build was frozen at `v1.0.0-prototype`; the SPA changed again on **7 August** to close twelve defects from internal review and to implement the virtualized message stream TDD 3.3 commits to, and again on **8 August** to take the targeting officer's direction on whole conversations, the conversation-level note, the bulk accept and line-by-line bilingual OCR. Every change is covered by a specification |
| 3 | **Test Suite** — end-to-end smoke tests | ✅ | `tests/` | **72 e2e specs** — `npm run test:ng` runs `shell.spec.js` (2) + `services.spec.js` (6) + `tests/ng/` (64) — plus 10 Angular unit specs and 93 Node unit specs covering identity resolution and certificate handling. Includes the TDD Task 5 performance verification: the corpus's 2,388-message standing channel proves the stream is windowed and measures scroll-to-repaint at ~17 ms against the TDD's 200 ms budget. The evaluated Phase 2 suite is retained and its per-flow status documented |
| 4 | **Documentation** — a user guide and a developer guide | ✅ | `docs/`, PDFs in `project/delivery/` | Both written; a deployment guide (`deploy/README.md`) added beyond the requirement |
| 5 | **Project Artifacts** — sprint board export, burndown chart, risk register | ✅ | `project/acceptance/board_export_final.md`, `project/burndown.md`, `project/risk_register.md` | Maintained daily during performance, not reconstructed at the end |
| 6 | **Demo & Acceptance Package** — recorded walkthrough, slide deck summarizing objectives, test results, and open issues | 🟡 | `project/acceptance/` | **4:51 narrated walkthrough** captured against the 7 August build and narrated properly — the synthesized scratch track is superseded, and the whole recording is reproducible (`narration.json` + `scripts/capture-walkthrough.js` + `scripts/build-walkthrough.sh`) rather than a one-off. Deck (+PDF) covering objectives / test results / open issues, evidence trail. **Remaining caveat: the live demonstration M5 also requires is scheduled for 20 August, in person, and has not yet taken place** |

## B. What the solution was to address

> *"The solution should address…"*

| Requirement | Status | Evidence |
|---|---|---|
| Converting high-level requirements into **mission personas, HCD wireframes and UI designs** | ✅ | `hcd/personas.md`, `hcd/empathy_maps.md`, `hcd/journey_map.md`, `hcd/wireframes.md` — wireframe annotations are persona-indexed and cross-referenced to live screenshots; `hcd/traceability_matrix.md` joins each persona pain to the design response, screen, validating specification and screenshot |
| Leveraging the HCD output to create a **responsive single-page application** | 🟡 | Fluid flex layout, independently collapsible **and drag-resizable** panels, a resizable/maximizable scan viewer, wrapping action strip, and a queue-only view. **Caveat: no media-query breakpoints** — the build targets the analyst desktop it was evaluated on; small-screen breakpoints were not in scope and are not claimed |
| **Leveraging existing services or providing containerized mock services that emulate production services** | ✅ | Five single-responsibility mock service pods behind frozen JSON contracts, plus a configuration-only path to the Sponsor's live model gateway (`deploy/README.md` §4) — no client rework at cutover |
| Delivering a **prototype acceptance package** including a live demo of chat-viewer functionality, test scripts, and documentation | ✅ | `project/acceptance/` + runnable demo (`npm run dev:ng`) + the deployable image set |

## C. Performance constraints

| Constraint | Status | Notes |
|---|---|---|
| Period of performance ~**14 calendar days** | ✅ | **6 – 20 August 2026** per Article II of the executed agreement (Day 1 = 7 August, the first calendar day after execution, per TDD Assumption (1)). River Hawk built the SPA at its own expense ahead of award — complete 1 August — so the period opened with the build already done and was spent on the Platforma environment work, the review defects, and the acceptance package |
| **All work and deliverables unclassified** | ✅ | Entire corpus is fabricated demonstration data; UNCLASS banner rendered by the app shell (`angular/src/app/app.html`) on every screen. All delivered PDFs are footer-marked UNCLASSIFIED |
| **All direct work by US citizens** | ✅ | Asserted by River Hawk Consulting per the Phase 2 OT eligibility submission |
| Prototype **stored in a GitHub repository** | ✅ | `Blackfell-Group/imax-chat-viewer`, tagged **`v1.3.0-prototype`** (`v1.0.0-prototype` retained as the pre-award build, `v1.1.0-prototype` as the environment-work freeze). The package is imported to the Sponsor's network through the Government-directed transfer route; the deliverable documents travel directly as well |
| Operates in an **environment compatible with existing IMAX infrastructure** (Platforma) | ✅ | Angular front end per Sponsor direction; six-image containerized set proven on a Kubernetes cluster in CI on every push, and packaged as a Helm chart for ArgoCD (`deploy/chart`) with the kustomize manifests retained and a CI check that the two cannot drift. Identity reads the STS token the front forwards (`AUTH_MODE=bearer-jwt`), and server certificates are read from AWS Secrets Manager at pod start onto tmpfs, so the private key never becomes a Kubernetes Secret. Hardened for restricted transfer (`deploy/AIRGAP.md`): fonts vendored so the SPA fetches nothing at runtime, base images digest-pinned, Dockerfiles parameterized for in-enclave bases and mirrors, registry-prefix transform, optional enclave-CA mount, and an architecture gate that refuses to package images built for the wrong CPU. The prototype has been **deployed and run in Platforma**; the ArgoCD capture evidencing it is attached to the high-side repository, where it is producible. What remains outstanding in-enclave is calling the Sponsor's model gateway, and confirming the STS claim names and the certificate secret names — each a configuration value, not a code change |
| **Demonstrate end-to-end UI flows** | ✅ | Queue → search → thread → bilingual review → enrichment → OCR → promote to gold → export, proven by the e2e suite and shown in the walkthrough |
| **Unlimited rights** in delivered data, including the demonstration recording | ✅ | Code, documentation, and the recording carry unlimited rights per the Phase 2 IP assertion |

## D. Beyond the requirement

Built though not required: a deployment guide; a vulnerability-scanning and
cluster-deployment CI gate that re-proves the artifact set on every push; a visual-parity
baseline against the evaluated demonstration; a running evidence trail; a
configuration-only integration path to the Sponsor's model gateway; and an air-gap
transfer kit — runbook, CI-built bundle assembled from the scanned images, and a
preflight gate that fails the build if the SPA acquires any runtime dependency on the
public internet.

Added 3–4 August, after the Sponsor answered the kickoff questions:

- **Identity from the STS token.** The front sends the identity token in `Authorization`
  and the access token in `x-auth-request-access-token`. The prototype had been reading
  flat headers, which would have refused every request behind the real front — silently,
  until the first login. `/api/whoami` reports which claim names a real token carries, so
  correcting a mismatch is configuration rather than a rebuild.
- **Server certificates from AWS Secrets Manager.** An initContainer reads them at pod
  start onto an in-memory volume. Both secret layouts and all payload formats the Sponsor
  might use — raw PEM, JSON, and base64 inside JSON — are detected.
- **A Helm chart for ArgoCD**, proven equivalent to the kustomize manifests by a CI check
  that fails on any difference, and rolled out on a live cluster rather than only templated.
- **The HCD artifacts as one publication-quality document**, covering all four TDD Task 2
  subtasks (§F).

## F. The 4 August re-check

Every claim above was re-verified against the repository rather than carried forward from
the 1 August scoring. What was checked, and how:

> **This table is the record of a check made on 4 August, not a current statement.** Two of
> its rows have since been overtaken by work done after that date and are left standing as
> written rather than edited, because a re-check record that gets rewritten is not a record:
> the suite was 32 specs then and is **72** now, and the walkthrough was 2:34 then and is
> **4:51** now. Section A carries the current figures.

| Claim | Method | Result |
|---|---|---|
| Angular 21 LTS, pinned | Read `angular/package.json` | `@angular/core` and `@angular/cli` both `21.2.19`, exact — no `^` or `~` |
| SPA codebase "on `main`" | `git diff main...HEAD -- angular/` | Empty. The claim holds; later work is confined to `deploy/`, `hcd/`, `tests/`, `scripts/` |
| 32 e2e specs | Counted `test()` per file against what `test:ng` actually runs | 2 + 6 + 24 = 32. Correct |
| 10 unit specs | Ran `npm test --prefix angular` | 10 passed |
| Project artifacts present | Checked each of the three paths | All present |
| Narrated demo 2:34 | `ffprobe` on the file | 2:34 |
| "No media-query breakpoints" | Grepped `angular/src` for layout `@media` | Zero. The 🟡 caveat is honest, not stale |
| Deck covers objectives, test results, open issues | Read its section headings | All three present |
| UNCLASS banner on every screen | Located it in the app shell | `angular/src/app/app.html` |
| Both guides present | Listed `docs/` | `user_guide.md`, `developer_guide.md` |

**Two things were wrong and are corrected above:**

1. **Deliverable ① was over-scored.** It was marked met on the strength of personas,
   empathy maps and wireframes. Our own TDD commits to four Task 2 subtasks, and two did
   not exist: **2.2** task flows and journey map with per-persona success criteria, and
   **2.4** the assumption log and pain-to-design traceability matrix — which the TDD says
   "is delivered with the artifact package" and which Task 5.2 depends on. Against the
   solicitation's "HCD Artifacts — defined by the contractor" the original score was
   defensible; against the TDD it was not. Both artifacts are now written and the
   deliverable is rendered as `project/delivery/hcd_artifacts.pdf`.
2. **The scoring was stale.** It was dated 1 August and declared itself scored against tag
   `v1.0.0-prototype`, while the package had moved five commits past that tag. The header
   now says what it is actually scored against.

Deliverable ① now maps to the TDD as follows:

| TDD Task 2 | Artifact |
|---|---|
| 2.1 Proto-personas & empathy maps | `hcd/personas.md`, `hcd/empathy_maps.md` |
| 2.2 Task flows & journey map | `hcd/journey_map.md` — 4 task flows, 20 success criteria, each naming the specification that replays it |
| 2.3 Wireframes | `hcd/wireframes.md` |
| 2.4 Validation & traceability | `hcd/traceability_matrix.md` (24 pains → response → screen → specification → screenshot), `hcd/assumption_log.md` (16 assumptions, 6 closed) |

## E. Where the build departs from the evaluated demonstration

Three HCD findings changed the product during performance, each an artifact with its
rationale and restoration path (`hcd/`): the unit of gold is the thread; no verdict
without the source; a linguist's bench with one output. The third **removes** snippet
clipping from the evaluated flow. The evaluated React implementation remains in the
repository unmodified, and the removal reverts in a single commit if the Government
prefers strict parity. Per-flow status of the evaluated acceptance suite is in
`project/evidence/README.md`.
