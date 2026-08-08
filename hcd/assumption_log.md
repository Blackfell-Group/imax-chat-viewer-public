# Assumption Log — IMAX Chat-Viewer (Deliverable ① HCD artifacts)

UNCLASSIFIED — TDD subtask 2.4. What we assumed, why we had to, what it would cost if the
assumption is wrong, and how to find out.

Direct end-user access was not assumed in the TDD and was not granted during performance.
Personas are therefore composites inferred from the Phase 2 solution demonstration and its
evaluated workflows. That is a defensible method on a fourteen-day prototype, but it means
the design rests on stated assumptions rather than observed users — and an assumption that
is written down can be checked, while one that is merely held cannot.

Status is as at delivery. **Open** means nobody has confirmed it.

## Design assumptions

| # | Assumption | Why we made it | If wrong | How to close it | Status |
|---|---|---|---|---|---|
| A1 | The linguist's unit of work is the whole thread, not a snippet | Persona work with Marisol's flow: a correction made on one message is meaningless without the surrounding exchange | The thread-level gold flow is the wrong shape; snippet clipping returns | Touchpoint #1 — show a linguist the promoted-thread flow and watch where they hesitate | **Open** — offered, not validated |
| A2 | A native speaker will not render judgment without the source in view | A translation reviewed against itself is unreviewable | The bilingual default wastes vertical space for no gain | Touchpoint #1 — ask whether they ever want translation-only | **Open** — offered, not validated |
| A3 | This application is a linguist's bench, and other roles consume its output downstream | Four personas fit in one screen only by making one of them the operator | Ken and Priya need first-class production paths, not read paths | Touchpoint #1 — ask who is expected to sit in front of it daily | **Open** — logged deviation #2 |
| A4 | Disposition state is shared across the team, not personal | Dana's tasking is defensible only if the markers mean the same thing to everyone | Needs per-user state and a merge story | Ask whether two officers may disagree about a thread's disposition | **Open** |
| A5 | Four personas bracket the real user population | The evaluated workflows describe these four roles; more would not have fitted the sprint | A significant workflow is unrepresented | Touchpoint #1 — ask which role is missing | **Open** |
| A6 | Machine translation is close enough to be worth correcting rather than replacing | The whole confirm/correct flow presumes it | The verdict badges describe an interaction nobody performs | First contact with the enclave gateway on real language pairs | **Open** — gateway unproven |

## Environment assumptions

| # | Assumption | Why we made it | If wrong | How to close it | Status |
|---|---|---|---|---|---|
| A7 | The authenticating front is the only path to the pod | Identity headers are trusted absolutely; nothing else makes that safe | Any caller can assert any identity, including group membership | Confirmed by River Hawk, 2 Aug | **Closed** |
| A8 | The front forwards identity as an STS token, not flat headers | Stated by the Sponsor, 3 Aug: `Authorization` carries the identity token | Every request is refused behind the real front | Implemented as `AUTH_MODE=bearer-jwt`; unverified against a real token | **Partly closed** — mechanism confirmed, claim names not |
| A9 | The STS token's claims use the common OIDC spellings (`sub`, `name`, `groups`, `org`) | No claim inventory was provided | Identity resolves empty and every request 401s | `GET /api/whoami` reports the claim names a real token carries; the fix is configuration | **Open** |
| A10 | Server certificates arrive via AWS Secrets Manager | Sponsor said certs are provided up front with no clear direction on how; the environment is AWS C2S | The initContainer path is unused; the file-based overlay is used instead | Both paths are built and proven; ask which | **Open** — both supported |
| A11 | Fixtures are an acceptable fallback when the model gateway is unreachable | Confirmed by the Sponsor: test data is fine | A demonstration silently shows canned output | Confirmed 3 Aug; pods now log which mode they are in | **Closed** |
| A12 | The cluster runs images we built, or rebuilds them from our source | Both are supported; which one is a platform policy question | A ferried image set is rejected, or a rebuild stalls on a missing mirror package | Ask whether the pipeline builds from source against an approved base | **Open** |

## Process assumptions

| # | Assumption | Why we made it | If wrong | How to close it | Status |
|---|---|---|---|---|---|
| A13 | Angular v21 LTS, pinned | Stated in writing at kickoff, unanswered | Rework against a different major | Confirmed by the Sponsor, 3 Aug: Angular 21 | **Closed** |
| A14 | Deliver-deployable rather than deploy-for-us | Kickoff assumption stated in writing | The delivery posture is wrong | Sponsor asked for a high-side working demo on their system, 3 Aug | **Closed** — deploy into their sandbox |
| A15 | Sandbox access would arrive during performance | Required for the deployment claim | Deployment is validated on our own cluster instead — which is what happened | Access in progress; onboarding session pending | **Open** — the reason DELIVERY.md does not claim Platforma |
| A16 | Wireframes could be frozen at Touchpoint 2 (about Day 7) | TDD schedule | Design churn into the build window | Touchpoints did not occur on the TDD schedule; wireframes were frozen against the evaluated demonstration instead | **Closed by substitution** |

## What this log implies

Six of the sixteen assumptions are closed. Of the ten still open, **five are design
assumptions awaiting Touchpoint #1** (A1–A5) — the prototype embodies them, and the whole
purpose of the touchpoint is to find out whether they hold. The rest are environment
questions that resolve on first contact with Platforma.

None of them is a defect. An assumption is only dangerous when it is invisible, and the
reason this document exists is that the TDD promised it and a design built on inference
rather than interviews needs somewhere to say so plainly.
