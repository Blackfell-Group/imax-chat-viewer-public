#!/usr/bin/env python3
"""Prove the Helm chart and the kustomize manifests describe the same deployment.

Both exist on purpose: ArgoCD deploys the chart, and the air-gap runbook's
`kubectl apply -k` flow needs manifests that work without Helm installed. Two
representations of one deployment is exactly the drift this repository argues
against everywhere else — deploy/tls.js is shared by both entrypoints so they
cannot diverge, and the TLS overlay patches are JSON6902 so a merge cannot
silently drop config.

So the drift is prevented the same way: by checking, not by remembering.

    ./scripts/compare-chart-kustomize.py            # base vs chart defaults
    ./scripts/compare-chart-kustomize.py --tls      # overlay vs tls.enabled

Compares the fields that decide behaviour — image, service account, ports,
envFrom, mounts, volumes, security contexts, probes, resources, and the
initContainer — rather than raw text, because labels and annotations
legitimately differ between the two tools and comparing those would produce
noise nobody would read twice.
"""
import json
import subprocess
import sys

try:
    import yaml
except ImportError:
    sys.exit("PyYAML required: pip install pyyaml")

TLS = "--tls" in sys.argv

KUSTOMIZE_TARGET = "deploy/overlays/tls" if TLS else "deploy/k8s"
HELM_ARGS = ["--set", "tls.enabled=true", "--set", "tls.source=secret"] if TLS else []


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"{' '.join(cmd)} failed:\n{r.stderr}")
    return r.stdout


def index(text):
    out = {}
    for d in yaml.safe_load_all(text):
        if d:
            out[(d["kind"], d["metadata"]["name"])] = d
    return out


def signature(d):
    """The fields that change what actually runs."""
    if d["kind"] != "Deployment":
        return None
    spec = d["spec"]["template"]["spec"]
    c = spec["containers"][0]
    inits = spec.get("initContainers", [])

    def probe(p):
        # kubelet defaults an unset scheme to HTTP, so absent and "HTTP" are the
        # same instruction. Normalise rather than report a difference that isn't.
        return (p["httpGet"].get("scheme") or "HTTP", p["httpGet"]["path"])

    return {
        "image": c["image"],
        "serviceAccount": spec.get("serviceAccountName"),
        "ports": [p["containerPort"] for p in c.get("ports", [])],
        "envFrom": sorted(json.dumps(e, sort_keys=True) for e in c.get("envFrom", [])),
        "volumeMounts": sorted(
            (m["name"], m.get("mountPath"), bool(m.get("readOnly")))
            for m in c.get("volumeMounts", [])
        ),
        "volumes": sorted(
            (v["name"], next(k for k in v if k != "name")) for v in spec.get("volumes", [])
        ),
        "containerSecurityContext": c.get("securityContext"),
        "podSecurityContext": spec.get("securityContext"),
        "liveness": probe(c["livenessProbe"]),
        "readiness": probe(c["readinessProbe"]),
        "resources": c.get("resources"),
        "initContainers": sorted(
            (i["name"], i["image"], tuple(i.get("command", []))) for i in inits
        ),
    }


kust = index(run(["kustomize", "build", KUSTOMIZE_TARGET]))
helm = index(run(["helm", "template", "imax", "deploy/chart", *HELM_ARGS]))

label = "TLS overlay" if TLS else "base"
print(f"==> {label}: kustomize {KUSTOMIZE_TARGET}  vs  helm chart")

status = 0

only_k = sorted(k for k in kust if k not in helm)
only_h = sorted(k for k in helm if k not in kust)
# The ServiceAccount is templated in the chart and a plain manifest in the base;
# both produce it, so a mismatch here is a real difference, not a tooling one.
if only_k:
    print(f"  FAIL: only kustomize produces: {only_k}")
    status = 1
if only_h:
    print(f"  FAIL: only helm produces: {only_h}")
    status = 1

same = 0
for key in sorted(set(kust) & set(helm)):
    if key[0] != "Deployment":
        continue
    a, b = signature(kust[key]), signature(helm[key])
    if a == b:
        same += 1
        continue
    status = 1
    print(f"  FAIL: {key[1]} differs")
    for field in a:
        if a[field] != b[field]:
            print(f"    {field}")
            print(f"      kustomize: {a[field]}")
            print(f"      helm:      {b[field]}")

print(f"  {same} deployments identical, {len(kust)} objects each")
if status == 0:
    print(f"  {label}: chart and manifests agree")
sys.exit(status)
