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

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: imax
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/Blackfell-Group/imax-chat-viewer-public.git
    targetRevision: main
    path: deploy/chart
    helm:
      values: |
        image:
          registry: <internal-registry>/imax/
        tls:
          enabled: true
          source: awssm
          awssm:
            endpoint: <regional Secrets Manager endpoint>
            stsEndpoint: <regional STS endpoint>
            certSecret: <secret name or ARN>
            keySecret: ""          # empty when one secret holds cert AND key
        serviceAccount:
          roleArn: <role our workload may assume>
        auth:
          mode: bearer-jwt
        ingress:
          enabled: true
          host: <hostname>
  destination:
    server: https://kubernetes.default.svc
    namespace: imax
  syncPolicy:
    automated: {prune: true, selfHeal: true}
    syncOptions: [CreateNamespace=true]
```

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
