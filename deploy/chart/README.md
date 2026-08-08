# IMAX Helm chart

Deploys the six-pod set: the Angular SPA on an Express edge, plus five mock
enrichment services. This is what ArgoCD points at.

```sh
helm install imax deploy/chart -f my-values.yaml
```

Installed with no values it reproduces `kubectl apply -k deploy/k8s` — plaintext
behind an authenticating front, identity parsed but not enforced, enrichment
answering from fixtures. Nothing environment-specific is assumed.

## ArgoCD

The Application is shipped as a file, not as something to retype:

```sh
$EDITOR deploy/argocd/application.yaml   # replace every <angle-bracket> value
kubectl apply -f deploy/argocd/application.yaml
```

Every placeholder in it is a value that cannot be known outside the enclave, and none of
them requires a code change — `docs/architecture.md` §10 lists them with the failure each
one produces if it is wrong.

Two choices in that file worth knowing about, because both are deliberate:

- **`targetRevision` is pinned to a tag**, not `main`. A prototype under evaluation should
  not change under the evaluator because someone pushed.
- **`syncPolicy` is not automated.** An unattended sync during a demonstration is a failure
  mode with no upside. Turn on automated pruning and self-heal once it is past evaluation.

Verified: `helm template` renders 19 objects from exactly the values in that file, `helm
lint` passes against them, and the chart/kustomize equivalence check still agrees.

### Milestone evidence

There is no `kubectl` against the target environment — deployment is a declarative sync.
One command carries everything the TDD asks for as M2 verification:

```sh
argocd app get imax -o yaml
```

Sync history is the "deployment log", the health and resource tree is "running pods", and
the source block is "repo access".


## The values that matter

| | |
|---|---|
| `image.registry` | Prefix for all six images. **Effectively required** off a local cluster — a bare name resolves against Docker Hub, which is unreachable in the target environment, and the pods sit in ImagePullBackOff. |
| `tls.enabled` / `tls.source` | `secret` mounts a Secret someone created; `awssm` has an initContainer read the material from AWS Secrets Manager at pod start onto a tmpfs, so the private key never lands on disk or in a Kubernetes Secret. |
| `tls.awssm.*` | Endpoint, STS endpoint and secret names. Supplied rather than derived — the hostname pattern for the target region must not enter this repository. Cert and key may live in one secret or two, as raw PEM, as JSON, or base64 inside JSON; all are detected. |
| `serviceAccount.roleArn` | IRSA. Empty means the credential chain falls back to the node instance profile, so the same chart works either way. |
| `auth.mode` | `bearer-jwt` for the target environment — identity from the STS token's claims. `proxy-header` for a front sending flat headers. |
| `modelGateway.*` | All three of endpoint, name and key are required to switch it on. Miss one and the services answer from fixtures, which is sanctioned — and logged at startup, so it is never a silent surprise. |
| `ingress.enabled` | How traffic normally reaches this. The platform's ingress controller terminates TLS and routes to `svc/imax-spa`; the application ships no proxy of its own. |

## Why the manifests still exist

`deploy/k8s` and `deploy/overlays/` are kept because the air-gap runbook's
`kubectl apply -k` flow has to work where Helm is not installed. Two
representations of one deployment is the drift this repository argues against
everywhere else, so it is checked rather than trusted:

```sh
./scripts/compare-chart-kustomize.py          # base
./scripts/compare-chart-kustomize.py --tls    # TLS overlay
```

CI runs both on every push and fails on any difference in image, service
account, ports, envFrom, mounts, volumes, security contexts, probes, resources
or initContainers. It then installs the chart on a live cluster and smokes it,
because a chart that has only ever been templated is a claim, not a deployment.

Full deployment guidance, including both certificate paths and the identity
model, is in [`../AIRGAP.md`](../AIRGAP.md).
