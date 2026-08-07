# Prototype Package Manifest — IMAX HCD Prototype OT

**River Hawk Consulting, LLC** · UNCLASSIFIED
Period of performance: **6 – 20 August 2026** (Agreement No. 5600002690012, effective
6 August 2026) · SPA build complete 1 August 2026, ahead of award

> **Status: ready for Government review — not yet delivered.** The prototype has not run
> in the target environment. Sandbox access has not been granted, so the container set is validated on
> a Kubernetes cluster in our own pipeline instead. Deployment into the target environment
> is a same-day exercise once credentials exist; until it runs there, River Hawk does not
> represent this as a completed delivery.
Repository: `Blackfell-Group/imax-chat-viewer` · Release tag: **`v1.2.0-prototype`**
Source mirror for transfer: `Blackfell-Group/imax-chat-viewer-public` (private pending AO approval)

> Tag history: `v1.0.0-prototype` froze the **pre-award** build of 1 August;
> `v1.1.0-prototype` added the target environment environment work (certificates from AWS Secrets
> Manager, identity from the STS token, the Helm chart for ArgoCD) and completed
> Deliverable ①; `v1.2.0-prototype` closes twelve defects from internal review, implements
> the virtualized message stream TDD 3.3 commits to, and adds the deliverables the
> executed agreement requires. **Pull `v1.2.0-prototype`.**

All work is unclassified and was performed by U.S. citizens. All corpus content is
fabricated demonstration data, marked by a banner on every screen.

## Work products

| # | Deliverable | Where | State |
|---|---|---|---|
| ① | HCD artifacts | [`hcd/`](hcd/) — personas · empathy maps · journey map & task flows · annotated wireframes · traceability matrix · assumption log · **three workflow-model findings**; delivered as [`project/delivery/hcd_artifacts.pdf`](project/delivery/hcd_artifacts.pdf) | Complete |
| ② | Angular SPA codebase (unlimited rights) | [`angular/`](angular/) — Angular 21 LTS, pinned; `main` | Complete; **not yet deployed to the target environment** |
| ③ | e2e smoke test suite | [`tests/`](tests/) — `npm run test:ng` (**49 specs**) · `npm test` (React reference, 16) · results report in [`project/delivery/test_results.pdf`](project/delivery/test_results.pdf) | Complete |
| ④ | User + developer guides | [`docs/`](docs/) + [`deploy/README.md`](deploy/README.md); PDFs in [`project/delivery/`](project/delivery/). Plus [`docs/architecture.md`](docs/architecture.md) — the **Article XII architecture deliverable** | Complete |
| ⑤ | Sprint board · burndown · risk register | Source in `project/`; delivered as [`project_artifacts.pdf`](project/delivery/project_artifacts.pdf) + [`board_export_final.csv`](project/delivery/board_export_final.csv), the PDF/CSV the TDD names for D5 | Complete |
| ⑥ | Demo & acceptance package | [`project/acceptance/`](project/acceptance/) — walkthrough recording, deck (+PDF), exports; evidence trail in [`project/evidence/`](project/evidence/) | Complete, silent walkthrough (see open items) |

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

**The transfer routes are split by what each deliverable actually needs.**

| | Route | What travels |
|---|---|---|
| **Source code** | Public mirror → the source-transfer system | `angular/`, `src/`, `deploy/`, `tests/`, `routes/`, `providers/`, `data/`, `static/`, `scripts/`, build configuration, and the operational docs needed to stand it up in-enclave |
| **Documents** | Email + the manual small-file DTO process | HCD artifacts, guides, the acceptance deck, compliance matrix, milestone record, architecture, board/burndown/risk register, and the walkthrough recordings |

Only the code needs a public route, because the source-transfer system carries open-source software. The
documents are small enough to send directly, and sending them directly is delivery to the
Government rather than publication.

> **The mirror `Blackfell-Group/imax-chat-viewer-public` is currently private.** It
> published the whole deliverable set — including the acceptance deck, the compliance
> matrix and the HCD artifacts — without the written AO approval Article XIII(b) requires.
> It will be rebuilt carrying code only, with a history that contains only code, and made
> public again once the AO approves. See
> [`project/acceptance/signed_ot_audit.md`](project/acceptance/signed_ot_audit.md) §2.1
> and §3.

The earlier `blackfellgroup.com/dl/` archives have been taken down and return 404.

CI re-proves the whole chain on every push: lint → production build → unit tests → e2e →
image builds → vulnerability scan → cluster deploy → in-cluster smoke.

## Requirements compliance

Every solicitation requirement scored against the delivered package, with caveats stated
rather than smoothed: [`project/acceptance/requirements_compliance.md`](project/acceptance/requirements_compliance.md)
(PDF in `project/delivery/`). Summary: all six required deliverables met; two carry
stated caveats (silent walkthrough recording; responsive-but-not-breakpointed layout);
one constraint is blocked on Government action (target-environment sandbox access).

## Verification

| Check | Result |
|---|---|
| Ported Phase 2 acceptance flows | 7 of 7 covered — 3 verbatim (1, 3, 4), 4 amended by logged HCD decisions |
| End-to-end suite (Angular build vs live mocks) | 32 passing |
| Angular unit tests | 10 passing |
| Deployment validation | Six-image set built, scanned (CRITICAL gate), deployed to a Kubernetes cluster in CI, smoked through the SPA proxy chain — green. **Not the target environment; see status above** |
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

1. **Live model gateway is wired but unproven against the enclave.** The enrichment
   services call the Sponsor's model gateway when `MODEL_ENDPOINT`, `MODEL_NAME` and
   `MODEL_API_KEY` are supplied at deploy time (see `deploy/README.md` §4), and fall back
   to fixtures otherwise — which the Sponsor has confirmed is acceptable. All three values
   are environment-specific and deliberately absent from this repository. Without enclave
   access River Hawk cannot exercise that path; first-run verification is a same-day task
   once credentials exist. Each pod now logs which mode it is in at startup, so a fixture
   fallback is visible rather than silent.
7. **Server certificates from AWS Secrets Manager** (`deploy/overlays/tls-awssm`). the target environment
   is an automated cluster on AWS the target AWS partition where certificates live in Secrets Manager behind a
   role, so an initContainer fetches them at pod start rather than a human staging a
   Secret. Proven end to end against a stand-in Secrets Manager, in CI and on real images;
   **unproven against the real endpoint**, which needs the secret names, the regional
   Secrets Manager and STS endpoints, and the role. Both secret layouts and both payload
   formats are handled, so those are configuration rather than a code change.
8. **Caller identity now reads the STS token** (`AUTH_MODE=bearer-jwt`). The Sponsor
   confirmed the front sends the identity token in `Authorization` and the access token in
   `x-auth-request-access-token`; the previous flat-header mode would have refused every
   request behind that front. The claim names are the common OIDC spellings and are **not
   confirmed** against the Sponsor's STS — `/api/whoami` reports the names a real token
   carries, and correcting them is a ConfigMap edit.
2. **Sponsor kickoff questions unanswered** (Angular version, sandbox access, deployment
   posture). Proceeded on assumptions stated in writing at kickoff: Angular v21 LTS
   pinned; deliver-deployable posture.
3. **The three HCD findings await Sponsor validation** — offered for touchpoint #1.
4. **target-environment sandbox access not granted**; deployment validated on a kind cluster per
   the agreed fallback. Sandbox deployment is a same-day exercise once credentials exist.
5. **Walkthrough recording is silent** — a narrated cut is pending voice-over work; the
   script and capture pipeline are in the repository.
6. **Screenshot-diff specs** trimmed per the pre-agreed scope-trim order; visual parity
   is evidenced by side-by-side captures instead.
