# M2 evidence — what to capture high-side

**Agreement No. 5600002690012** · River Hawk Consulting, LLC · UNCLASSIFIED
Milestone M2 · Day 4 · **due Monday 10 August 2026**

Written to be worked from directly. Everything below is read-only — nothing here changes
the deployment.

## What the agreement asks for

TDD success indicator:

> *"GitHub repo scaffolded; all five mock services containerized and smoke-deployed to
> [the target environment] (or matched local K8s if sandbox access is pending)."*

TDD verification:

> *"Deployment log; running pods; repo access."*

That wording assumes someone can run commands against the cluster. Deployment there is an
ArgoCD sync, so the same three facts come out of ArgoCD instead — and all three come out of
**one command**.

| TDD wording | What actually evidences it |
|---|---|
| Deployment log | The Application's sync history — revision, result, timestamp |
| Running pods | The Application's health status and resource tree |
| Repo access | The Application's source repository and target revision |

---

## The one command

```sh
argocd app get imax -o yaml
```

If the CLI is not available, the ArgoCD **web UI Application view** shows the same three
things on one screen — a screenshot of it is acceptable evidence.

That is the whole ask. Everything below is for reading the result and for the cases where
it does not look right.

---

## What a good result looks like

Four things to confirm in that output:

1. **`status.sync.status: Synced`**
2. **`status.health.status: Healthy`**
3. **Six workloads present and healthy** — `imax-spa`, plus `imax-mock-search`,
   `imax-mock-translation`, `imax-mock-entities`, `imax-mock-summarize`, `imax-mock-ocr`.
   Six is the number that matters: the milestone is about all five services, not the
   application alone.
4. **`spec.source.targetRevision`** naming the revision that was deployed.

If reading YAML on screen is awkward, these two give the same facts in a readable form:

```sh
argocd app get imax                 # summary: sync, health, revision
argocd app resources imax           # the resource tree, one line per workload
```

## Backup evidence, if the CLI is unavailable

Any one of these is sufficient on its own:

- A screenshot of the ArgoCD Application view showing sync status, health, and the
  resource tree with all six workloads.
- `argocd app history imax` — the sync history alone, which is the closest literal match to
  "deployment log".
- If some `kubectl` is available after all: `kubectl -n imax get pods -o wide` is the
  literal "running pods" the TDD asked for.

---

## If it is not Healthy

Likely causes, in the order they actually occur. Each is a configuration value, not a code
change — the full list is `docs/architecture.md` §10.

| Symptom | Cause | Fix |
|---|---|---|
| Pods stuck in `Init:0/1` | The certificate initContainer cannot reach Secrets Manager | `AWS_SECRETSMANAGER_ENDPOINT` unset, or no VPC endpoint in the target VPC |
| Init container `AccessDenied` | The workload's role cannot read the secret | Role ARN annotation on the `imax` ServiceAccount, or the IAM policy |
| Init container "not PEM" | Wrong secret, or DER rather than PEM | Check `TLS_CERT_SECRET` / `TLS_KEY_SECRET` names. Both one-secret and two-secret layouts are handled; leave `keySecret` empty when one secret carries both |
| Pods restart in a loop after TLS is enabled | Probes still on HTTP against a TLS port | Chart handles this; if manifests were hand-edited, check `scheme: HTTPS` |
| SPA up, services 502 | The certificate's SANs do not cover the in-cluster service names | Reissue with all six names, or run without TLS between pods |
| Everything healthy but translations look canned | Model gateway not configured | Expected. `MODEL_ENDPOINT` and `MODEL_API_KEY` must **both** be set or the services answer from fixtures. Each pod logs which mode it is in at startup |

**A partial result is still worth capturing.** If it is Synced but Degraded, capture it
anyway — the milestone is evidenced by what the deployment actually did, and a documented
partial state is more useful than a delayed complete one. The fallback the TDD names
(matched local Kubernetes) is satisfied continuously by CI regardless, so M2 does not fail
on this.

---

## Getting it back

High-side egress is the constraint, not the capture. In order of preference:

1. **Text** — the output of `argocd app get imax`, transcribed or carried out by whatever
   the normal process allows. Smallest and most useful.
2. **Screenshot** of the Application view.
3. **Written attestation** — the four facts above recorded by hand with date and time. Less
   good, but it is evidence and it is honest.

Send whatever you get to me and I will attach it to
`project/acceptance/milestone_record.md` under M2 and re-score the row from 🟡 to ✅.

---

## What is already in hand

M2 does not rest solely on this. Already evidenced, and already in the milestone record:

- GitHub repository with CI on every push
- Five schema-pinned mock services, containerized
- Dockerfiles, Kubernetes manifests, and a Helm chart proven equivalent to them by a CI
  check that fails on any difference
- The six-image set built, scanned against a CRITICAL vulnerability gate, deployed to a
  Kubernetes cluster and smoke-tested — on every push
- Pod sizing inside the TDD's 0.5 vCPU / 512 MB ceiling (250m CPU / 256Mi memory)

The only thing missing is evidence from the target environment itself.
