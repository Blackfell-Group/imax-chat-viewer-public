# Prototype Package Manifest — IMAX HCD Prototype OT

**River Hawk Consulting, LLC** · UNCLASSIFIED
Period of performance: **6 – 20 August 2026** (Agreement No. 5600002690012, effective
6 August 2026) · SPA build complete 1 August 2026, ahead of award

> **Status: transmitted for acceptance at M5.** The prototype has been deployed and run in
> the target environment. The ArgoCD capture evidencing the sync and the running workloads is
> attached to the high-side repository, which is where it is producible — it is generated
> inside the enclave and cannot be carried low-side into this package. Independently, the
> container set is re-validated on a Kubernetes cluster in our own pipeline on every push.
Repository: `Blackfell-Group/imax-chat-viewer` · Release tag: **`v1.3.0-prototype`**

> Tag history: `v1.0.0-prototype` froze the **pre-award** build of 1 August;
> `v1.1.0-prototype` added the target environment work (certificates from AWS Secrets
> Manager, identity from the STS token, the Helm chart for ArgoCD) and completed
> Deliverable ①; `v1.2.1-prototype` closed twelve defects from internal review plus three found
> by QA, implements the virtualized message stream TDD 3.3 commits to, restacks the scan
> viewer and gives document translations the same review a message gets, and adds the
> deliverables the executed agreement requires; `v1.3.0-prototype` takes the targeting
> officer's direction that a conversation is never broken up (a 2,388-message standing
> channel carried whole, with a conversation-level note), puts each OCR line beside its
> translation in reading order, adds bulk accept, and negotiates the model-gateway wire
> format at pod start. **Pull `v1.3.0-prototype`.**

All work is unclassified and was performed by U.S. citizens. All corpus content is
fabricated demonstration data, marked by a banner on every screen.

## Work products

| # | Deliverable | Where | State |
|---|---|---|---|
| ① | HCD artifacts | [`hcd/`](hcd/) — personas · empathy maps · journey map & task flows · annotated wireframes · traceability matrix · assumption log · **three workflow-model findings**; delivered as [`project/delivery/hcd_artifacts.pdf`](project/delivery/hcd_artifacts.pdf) | Complete |
| ② | Angular SPA codebase (unlimited rights) | [`angular/`](angular/) — Angular 21 LTS, pinned; `main` | Complete; **deployed and run in the target environment** |
| ③ | e2e smoke test suite | [`tests/`](tests/) — `npm run test:ng` (**72 specs**) · `npm test` (React reference, 16) · results report in [`project/delivery/test_results.pdf`](project/delivery/test_results.pdf) | Complete |
| ④ | User + developer guides | [`docs/`](docs/) + [`deploy/README.md`](deploy/README.md); PDFs in [`project/delivery/`](project/delivery/). Plus [`docs/architecture.md`](docs/architecture.md) — the **Article XII architecture deliverable** | Complete |
| ⑤ | Sprint board · burndown · risk register | Source in `project/`; delivered as [`project_artifacts.pdf`](project/delivery/project_artifacts.pdf) + [`board_export_final.csv`](project/delivery/board_export_final.csv), the PDF/CSV the TDD names for D5 | Complete |
| ⑥ | Demo & acceptance package | [`project/acceptance/`](project/acceptance/) — walkthrough recording, deck (+PDF), exports; evidence trail in [`project/evidence/`](project/evidence/) | Complete; **live demonstration 20 August** |

## How to run it

```sh
npm install && npm --prefix angular install
npm run dev:ng            # mock services :5177 + app :4200
```

Deployable set (six images, kustomize manifests):

```sh
./deploy/build-images.sh 0.1.0
kubectl apply -k deploy/k8s
kubectl port-forward svc/imax-spa 8443:8443
```

## How to get it

**The delivered article is the repository on the Sponsor's network.** The source is
imported to it through the Government-directed transfer route; the documents travel
directly.

| | Route | What travels |
|---|---|---|
| **Source code** | Government-directed source-transfer route, into the Sponsor's network | `angular/`, `src/`, `deploy/`, `tests/`, `routes/`, `providers/`, `data/`, `static/`, `scripts/`, build configuration, and the operational docs needed to stand it up in-enclave |
| **Documents** | Email + the manual small-file DTO process | HCD artifacts, guides, the acceptance deck, compliance matrix, milestone record, architecture, board/burndown/risk register, and the walkthrough recording |

Once imported, that repository is self-sufficient: it carries the source, both Dockerfiles,
both committed lockfiles, the kustomize manifests and the Helm chart, and builds the
six-image set without reaching the public internet. `deploy/AIRGAP.md` is the procedure.

CI re-proves the whole chain on every push: lint → production build → unit tests → e2e →
image builds → vulnerability scan → cluster deploy → in-cluster smoke.

## Requirements compliance

Every solicitation requirement scored against the delivered package, with caveats stated
rather than smoothed: [`project/acceptance/requirements_compliance.md`](project/acceptance/requirements_compliance.md)
(PDF in `project/delivery/`). Summary: all six required deliverables met; two carry
stated caveats (the live demonstration falls on 20 August and has not yet taken place;
responsive-but-not-breakpointed layout).

## Verification

| Check | Result |
|---|---|
| Ported Phase 2 acceptance flows | 7 of 7 covered — 3 verbatim (1, 3, 4), 4 amended by logged HCD decisions |
| End-to-end suite (Angular build vs live mocks) | 72 passing |
| React reference suite (evaluated Phase 2 build) | 16 passing |
| Angular unit tests | 10 passing |
| Node unit tests (identity, certificates, model gateway) | 93 passing |
| Deployment validation | Six-image set built, scanned (CRITICAL gate), deployed to a Kubernetes cluster in CI, smoked through the SPA proxy chain — green. Separately deployed and run in the target environment; see status above |
| Visual parity baseline | [`project/parity/`](project/parity/) — React (evaluated) vs Angular, same viewport and corpus |

## Design evolution during performance (HCD findings)

The build implements the evaluated Phase 2 solution plus three findings from persona
work, each recorded as an HCD artifact with its rationale and a restoration path:

1. **The unit of gold is the thread** ([`hcd/linguist_workflow_model.md`](hcd/linguist_workflow_model.md)) — a linguist's product is the whole translated, reviewed thread, not a snippet.
2. **No verdict without the source** ([`hcd/bilingual_display_model.md`](hcd/bilingual_display_model.md)) — translations render by default and always bilingually; corrections are written against the original.
3. **A linguist's bench, one output** ([`hcd/one_output_model.md`](hcd/one_output_model.md)) — one output path (promote to gold), thread-level enrichment, a button-free stack, and collapsible find tools.

Finding 3 removes evaluated behavior (snippet clipping → tray → product export). The
React reference implementation in this repository is untouched and retains the full
evaluated behavior; the removal is a single-commit revert if the Government prefers
strict parity. See each artifact's "Contract posture" section.

## Open items

1. **A live model gateway is built beyond the requirement, and has not been called from
   inside the enclave.** The solicitation asks for *"existing services **or** containerized
   mock services that emulate production services"*, and the five schema-pinned mock services
   satisfy it — the Sponsor has separately confirmed fixtures are acceptable. The gateway
   path is additional capability River Hawk built on top: supply `MODEL_ENDPOINT`,
   `MODEL_NAME` and `MODEL_API_KEY` at deploy time (`deploy/README.md` §4) and the enrichment
   services call a real model instead, with no client rework. All three values are
   environment-specific and deliberately absent from this repository, and the in-enclave
   endpoint has not yet been pointed at.

   The client side is nonetheless proven, so what remains is the endpoint rather than the
   code: the
   provider was run end to end against a real OpenAI-compatible model, and the wire-format
   differences that only a live model reveals were found and handled — `max_tokens` versus
   `max_completion_tokens`, and reasoning models rejecting `temperature`. The pod negotiates
   both at startup (`docs/architecture.md` §6.2.1). Translation returned clean plain text;
   OCR returned 32 lines from the Arabic customs declaration, every one paired with its
   English. Each pod also logs which mode it is in at startup, so a fixture fallback is
   visible rather than silent. First-run verification in-enclave is a same-day task.
2. **Server certificates from AWS Secrets Manager** (`deploy/overlays/tls-awssm`). The target
   environment is an automated Kubernetes cluster on AWS, where certificates live in Secrets
   Manager behind a role, so an initContainer fetches them at pod start rather than a human staging a
   Secret. Proven end to end against a stand-in Secrets Manager, in CI and on real images;
   **unproven against the real endpoint**, which needs the secret names, the regional
   Secrets Manager and STS endpoints, and the role. Both secret layouts and both payload
   formats are handled, so those are configuration rather than a code change.
3. **Caller identity now reads the STS token** (`AUTH_MODE=bearer-jwt`). The Sponsor
   confirmed the front sends the identity token in `Authorization` and the access token in
   `x-auth-request-access-token`; the previous flat-header mode would have refused every
   request behind that front. The claim names are the common OIDC spellings and are **not
   confirmed** against the Sponsor's STS — `/api/whoami` reports the names a real token
   carries, and correcting them is a ConfigMap edit.
4. **Sponsor kickoff questions unanswered** (Angular version, sandbox access, deployment
   posture). Proceeded on assumptions stated in writing at kickoff: Angular v21 LTS
   pinned; deliver-deployable posture.
5. **The three HCD findings await Sponsor validation** — offered for touchpoint #1.
6. **Target-environment deployment evidence is held high-side.** The prototype has been
   deployed and run there; the ArgoCD Application capture is attached to the high-side
   repository because it is generated inside the enclave and has no low-side path out.
7. **The live demonstration M5 requires falls on 20 August** and is provided in person on
   the day. The recorded walkthrough is delivered and is the standing artifact —
   [`RiverHawk_IMAX_Walkthrough_2026-08-08.mp4`](project/acceptance/RiverHawk_IMAX_Walkthrough_2026-08-08.mp4)
   (4:51), narrated, and reproducible from `narration.json`,
   `scripts/capture-walkthrough.js` and `scripts/build-walkthrough.sh` rather than a one-off.
8. **Screenshot-diff specs** trimmed per the pre-agreed scope-trim order; visual parity
   is evidenced by side-by-side captures instead.
