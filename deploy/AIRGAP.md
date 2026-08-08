# Air-Gap Transfer and Deployment — IMAX Chat-Viewer

**UNCLASSIFIED.** Companion to `deploy/README.md`, which covers ordinary deployment.
This document covers the part that is different when the target has no route to the
public internet: what crosses, how it is built, and what must be configured on the
far side.

Written to be read **in the enclave**, by someone who cannot look anything up.

---

## 0. The one-shot problem

A one-way transfer means every mistake costs a full DTO cycle plus review queue time.
Assume you get **one attempt**. Everything below is arranged so that the bundle is
self-contained and self-diagnosing: the images are the exact ones that passed the
vulnerability scan and the cluster test, the runbook travels with them, and the
application starts and demonstrates every flow **without** the model gateway, the
CA, or any external service being configured. Configuration only adds live
translation on top of a system that already works.

If something does go wrong on the far side, §7 is the triage table. Work it before
requesting another transfer.

---

## 1. What has to cross

Depends on which path §2 selects. Sizes measured from the CI artifact, not estimated.

### One archive

| Item | Size | Contains |
|---|---|---|
| `imax-prototype-<tag>.tar.gz` | **~85 MB** | Everything below |
| `imax-prototype-<tag>.tar.gz.sha256` | 94 B | Verify before and after the hop |

```
imax-prototype-<tag>/
  images/          six built images in one archive, plus DIGESTS.txt
  k8s/             base manifests
  overlays/tls/         certificates from a Secret someone creates
  overlays/tls-awssm/   certificates from AWS Secrets Manager (the target environment)
  src/             the complete source repository, at SOURCE_COMMIT.txt
  load-and-deploy.sh    enclave-ca.sh    README.md (this file)
  SHA256SUMS       per-file, computed before archiving
```

**One file, not two, because a DTO submission is a unit.** Two archives are two things to
track, two things to review, and two things that can arrive apart — and the one that goes
missing is always the one you needed. Both ways in (§2) are inside it: ferry the built
images, or hand `src/` to the yard and let it rebuild. The choice gets made on the far
side, by whoever knows what that cluster will accept, rather than guessed on this one.

`SOURCE_COMMIT.txt` records the commit `src/` was taken from, and `images/DIGESTS.txt`
records what was built. Together they tie the two halves to each other, which is what
makes "rebuild it yourself and compare" a possible conversation.

`deploy/make-offline-bundle.sh` refuses to build from a dirty working tree. The images are
built from the working tree while `src/` comes from `HEAD`, so uncommitted work would ship
in one half and not the other, and a yard rebuild would silently produce something other
than the images sitting beside it.

(The image half was 80 MB while the SPA pod ran nginx. Collapsing to one Node base across
all six pods deduplicated the shared layers and took roughly a third off.)

### Verify on arrival

```
sha256sum -c imax-prototype-<tag>.tar.gz.sha256      # or shasum -a 256 -c
tar -xzf imax-prototype-<tag>.tar.gz
cd imax-prototype-<tag>
sha256sum -c SHA256SUMS                              # per-file, after extraction
```

### What is on the transfer

The complete repository, including the demonstration videos, the PDFs and
`project/evidence/screens/`. The earlier packages left those out because media draws the
most scrutiny in transfer review and none of it is needed to build or run; the package is
now complete instead, and the ~15 MB of media is the cost.

That judgement is still available if a reviewer wants it smaller —
`NO_MEDIA=1 ./deploy/make-offline-bundle.sh` drops the media and takes `src/` from 18 MB
to 2.7 MB — but the default is everything.

`.git` is not included (41 MB of history, and none of it needed to build).

### Getting it

Too large to email. It goes up behind CloudFront:

```
./deploy/publish-bundle.sh <tag> --profile <aws profile>
```

and comes down with no credentials:

```
curl -fsSLO https://blackfellgroup.com/dl/imax-prototype-<tag>.tar.gz
curl -fsSLO https://blackfellgroup.com/dl/imax-prototype-<tag>.tar.gz.sha256
sha256sum -c imax-prototype-<tag>.tar.gz.sha256
```

**That URL is public and unauthenticated** — anyone who has it can download. It does not
expire on its own; take it down when the hand-off is done:

```
./deploy/publish-bundle.sh <tag> --profile <aws profile> --remove
```

Note that the `.sha256` is served from the same origin as the archive it attests to, so it
proves the download was not corrupted in transit and nothing more. A recipient who needs
the stronger claim should be given the digest by another route.

### Provenance

CI runs `make-offline-bundle.sh` on every push to `main` **after** the trivy CRITICAL
gate, the cluster smoke, and both TLS overlay rollouts. Take the artifact from the Actions
run rather than building locally: what crosses is then demonstrably the image set that
passed all of them, and no local Docker daemon is involved.

---

## 2. Two ways in — pick one, and ask first

Both are inside the one archive, so this is a decision made here, on arrival, with
whoever knows what this cluster will accept. Nothing has to be sent for again.

### Path A — ferry the built images (default)

`images/` carries the six images already built and scanned. Load them and deploy.
Nothing is compiled inside the enclave, so no npm registry, no Alpine mirror, and no
base-image access is required. **This is the path to plan on** unless the Sponsor
says otherwise.

### Path B — the yard rebuilds from our Dockerfiles

Some enclaves will not run an image they did not build. The pattern there is that the
Dockerfile is rebased onto an approved internal base image and the yard builds,
hardens, and publishes it to an in-enclave registry.

`src/` is the complete repository for exactly this, taken from the commit in
`SOURCE_COMMIT.txt`. Both Dockerfiles are already parameterised — no source change is
needed, and every command below runs from inside `src/`:

```
cd src
docker build -f deploy/Dockerfile.mock \
  --build-arg SERVICE=translation \
  --build-arg NODE_BASE=<approved base image> \
  --build-arg NPM_REGISTRY=<internal npm mirror> \
  --build-arg OS_PATCH=0 \
  -t <registry>/imax/imax-mock-translation:<tag> .
```

`OS_PATCH=0` skips `apk upgrade` — an approved hardened base is already patched, and
there is no Alpine mirror to reach. `deploy/build-images.sh` reads the same values
from the environment and builds all six.

The enclave has an internal npm registry, so this path is viable. Both images install
from committed lockfiles with `npm ci` — never `npm install` — so the versions the
enclave resolves are the versions we built and scanned. Point `NPM_REGISTRY` at the
mirror and build; `npm ci` either resolves the lock or names the package it could not
find. If the mirror turns out to be short, fall back to Path A — the bundle's images
are already built, so a gap blocks nothing.

**Step-by-step is in §2B below.**

---

## 2B. Building from source, high side — exact steps

Everything here runs **in the enclave**. Nothing reaches the public internet.

### Prerequisites

| Need | Why | If missing |
|---|---|---|
| Docker (or Podman/buildah) with a build daemon | Builds the six images | Use Path A |
| The internal npm registry host | `npm ci` for both images | Use Path A |
| An approved Node 22 Alpine-family base image | Every image's `FROM` — all six share one base | Ask the yard which is approved |
| `kubectl` + credentials for the target namespace | Deploy | — |

### 1. Verify and unpack

```
sha256sum -c imax-src-<tag>.tar.gz.sha256
tar -xzf imax-src-<tag>.tar.gz
cd imax-chat-viewer
```

### 2. Set the build environment

```
export NODE_BASE=<approved node 22 alpine image>          # e.g. <registry>/base/node:22-alpine
export NPM_REGISTRY=<internal npm registry URL>
export OS_PATCH=0                                          # no Alpine mirror; approved base is patched
export IMAGE_PREFIX=<registry>/imax/                       # trailing slash required
```

`OS_PATCH=0` skips `apk upgrade`. Leave it at `1` only if the enclave has an Alpine
package mirror — otherwise the build fails at that line.

**One base image, not two.** The SPA pod used to run nginx; it now runs an Express edge
(`deploy/spa-entry.js`) on the same Node base as the five enrichment pods. That is one
approved base to negotiate with the yard instead of two, one package ecosystem to patch
and scan, and one less thing to get wrong here.

**On UIDs:** the published the target environment guidance sets no UID requirement — it asks only for
a non-root user, which uid 1000 satisfies. The manifests deliberately **do not pin
`runAsUser`**, so a namespace that assigns its own UID range (an OpenShift-style SCC,
for instance) is free to do so; the images tolerate an arbitrary non-root UID.

They do declare the restricted Pod Security Standard fields — `seccompProfile:
RuntimeDefault`, `allowPrivilegeEscalation: false`, `capabilities: drop: [ALL]` —
because an enforcing namespace rejects pods that omit them.

### 3. Build all six

```
./deploy/build-images.sh 1.0.0
```

Reads every variable above and builds `imax-mock-{search,translation,entities,summarize,ocr}`
then `imax-spa`. Roughly 3–6 minutes cold.

**If `npm ci` fails**, the message names the package it could not resolve. That is a
mirror gap, not a source problem — either have the package mirrored, or fall back to
Path A.

### 4. Scan

Run whatever the enclave requires. Low-side, CI gates on trivy CRITICAL with
`--ignore-unfixed`, and the images pass:

```
trivy image --severity CRITICAL --exit-code 1 --ignore-unfixed ${IMAGE_PREFIX}imax-spa:1.0.0
```

### 5. Push

```
for IMG in imax-spa imax-mock-search imax-mock-translation \
           imax-mock-entities imax-mock-summarize imax-mock-ocr; do
  docker push "${IMAGE_PREFIX}${IMG}:1.0.0"
done
```

No registry? Load onto every node instead and skip step 6:

```
docker save ${IMAGE_PREFIX}imax-spa:1.0.0 ... | ctr -n k8s.io images import -
```

### 6. Point the manifests at the registry

```
cd deploy/k8s
for IMG in imax-spa imax-mock-search imax-mock-translation \
           imax-mock-entities imax-mock-summarize imax-mock-ocr; do
  kustomize edit set image "${IMG}=${IMAGE_PREFIX}${IMG}:1.0.0"
done
cd ../..
```

Skip only if the images are on the nodes under their bare names — `imagePullPolicy:
IfNotPresent` then finds them locally. Otherwise the kubelet resolves bare names
against Docker Hub and the pods sit in `ImagePullBackOff`.

### 7. Deploy

```
kubectl apply -k deploy/k8s                    # plaintext base
# or, if every hop must be TLS (§10 — create the imax-tls Secret first):
kubectl apply -k deploy/overlays/tls
kubectl rollout status deploy -l part-of=imax-chat-viewer --timeout=180s
```

Then follow §4 steps 2–5 for the smoke and the identity / TLS / gateway configuration —
they are identical whichever path built the images.

### 8. Smoke

```
kubectl port-forward svc/imax-spa 8443:8443 &
curl -sf http://localhost:8443/healthz
curl -sf http://localhost:8443/ | grep -q app-root && echo 'shell OK'
curl -sf http://localhost:8443/api/search/threads | grep -q threads && echo 'search OK'
curl -sf -X POST http://localhost:8443/api/translate -H 'Content-Type: application/json' \
     -d '{"messageId":"m-1","srcLang":"ar"}' | grep -q 'Abu Karim' && echo 'translate OK'
curl -sf -X POST http://localhost:8443/api/ocr -H 'Content-Type: application/json' \
     -d '{"attachmentId":"a-7001"}' | grep -q 'BILL OF LADING' && echo 'ocr OK'
curl -sfI http://localhost:8443/fonts/material-icons.woff2 | head -1
```

The last one is not optional. Then open the UI: **the toolbar must show icons.** Words
like `translate` or `chevron_right` mean the font did not ship — a build problem, not a
configuration one.

At this point the application is fully usable on fixtures. Steps 9 and 10 are additive.

### 9. Model gateway (optional)

See §5.

### 10. Enclave CA (only if step 9 was done)

```
./deploy/enclave-ca.sh /path/to/enclave-root-ca.pem
```

See §6.

---

## 3. Registry prefix

The manifests ship with bare image names (`imax-spa:0.1.0`). A kubelet resolves a
bare name against Docker Hub, which is unreachable here, so the pods will sit in
`ImagePullBackOff` with what looks like a hang. Two options:

**Images on every node, no registry** — load onto each node and leave the manifests
alone. `imagePullPolicy: IfNotPresent` then finds them locally.

```
docker load  -i images/imax-images-<tag>.tar.gz          # docker runtime
ctr -n k8s.io images import images/imax-images-<tag>.tar # containerd runtime
```

**In-enclave registry** — retarget the whole set at once; do not hand-edit six
Deployments:

```
cd k8s
kustomize edit set image imax-spa=<registry>/imax/imax-spa:<tag>
# ...repeat per service, or fill the commented `images:` block in kustomization.yaml
```

`load-and-deploy.sh <registry-prefix>` in the bundle does the push and the retarget
in one pass.

---

## 4. Deploy

Five steps, in this order. Each one is verifiable before the next, so a failure tells you
where you are rather than that "it didn't work".

### Step 1 — deploy plaintext, no configuration

```
./load-and-deploy.sh --registry <registry>/imax/     # or no --registry if images are on the nodes
```

Equivalent by hand: `kubectl apply -k k8s` then
`kubectl rollout status deploy -l part-of=imax-chat-viewer --timeout=180s`.

### Step 2 — smoke it

```
kubectl port-forward svc/imax-spa 8443:8443 &
curl -sf http://localhost:8443/healthz
curl -sf http://localhost:8443/ | grep -q app-root && echo 'shell OK'
curl -sf http://localhost:8443/api/search/threads | grep -q threads && echo 'search OK'
curl -sf -X POST http://localhost:8443/api/translate -H 'Content-Type: application/json' \
     -d '{"messageId":"m-1","srcLang":"ar"}' | grep -q 'Abu Karim' && echo 'translate OK'
curl -sf -X POST http://localhost:8443/api/ocr -H 'Content-Type: application/json' \
     -d '{"attachmentId":"a-7001"}' | grep -q 'BILL OF LADING' && echo 'ocr OK'
curl -sfI http://localhost:8443/fonts/material-icons.woff2 | head -1
```

Then open the UI. **The toolbar must show icons.** Words like `translate` or
`chevron_right` mean the fonts did not ship — a build problem, not a configuration one;
re-cut the bundle from a green CI run rather than trying to fix it here.

**At this point the bench is fully usable** — queue, search, bilingual review, entity
extraction, OCR, promote to gold, export — answering from fixtures. Everything below is
additive, and any of it can be skipped or deferred.

### Step 3 — caller identity (§9)

```
kubectl patch configmap imax-auth --type=merge -p '{"data":{
  "AUTH_HEADER_ID":"<the front id header>",
  "AUTH_HEADER_NAME":"<display name header>",
  "AUTH_HEADER_GROUPS":"<groups header>",
  "AUTH_HEADER_ORG":"<org header>",
  "AUTH_MODE":"proxy-header",
  "AUTH_REQUIRED_GROUPS":"<group that should have this bench>"}}'
kubectl rollout restart deploy/imax-spa
```

Verify through the front, not the port-forward — a port-forward bypasses it and will
return 401:

```
curl -s https://<front URL>/api/whoami | python3 -m json.tool
```

Defaults are the OpenLake set (`x-ain`, `x-name`, `x-ismemberof`, `x-org`), so if the
front matches those, only `AUTH_MODE` and `AUTH_REQUIRED_GROUPS` need setting.

### Step 4 — TLS everywhere, if required (§10)

Only if security requires pod-to-pod encryption as well as the ingress hop:

```
kubectl create secret generic imax-tls \
  --from-file=tls.crt=<cert>.pem --from-file=tls.key=<key>.pem --from-file=ca.pem=<ca>.pem
./load-and-deploy.sh --tls
curl -sf --cacert <ca>.pem https://localhost:8443/healthz
curl -s http://localhost:8443/healthz     # must FAIL — no plaintext on a TLS port
```

### Step 5 — model gateway and its CA (§5, §6)

```
kubectl patch configmap imax-model-gateway --type=merge -p '{"data":{
  "MODEL_ENDPOINT":"<gateway base URL ending in /v1>",
  "MODEL_NAME":"<model served by that gateway>"}}'
kubectl create secret generic imax-model-gateway \
  --from-literal=MODEL_API_KEY='<key>' --dry-run=client -o yaml | kubectl apply -f -
./enclave-ca.sh <enclave-root-ca>.pem
```

Unconfigured, the enrichment services answer from fixtures and log that they did — a
gateway outage degrades the bench to the mock rather than blocking the linguist, and the
Sponsor has confirmed that mock data is an acceptable fallback. Check which mode a pod is
actually in rather than assuming:

```
kubectl logs deploy/imax-mock-translation | grep 'model gateway'
```

### Hand off to the front

`imax-spa` is the only user-facing service. Point the target environment route or ingress at
`svc/imax-spa:8443`. The five enrichment services are ClusterIP and are additionally
restricted by NetworkPolicy to accept traffic only from the SPA pod.

---

## 5. Model gateway

The five enrichment pods call an OpenAI-wire-compatible gateway when configured, and
answer from fixtures when not. **Three values are required, and all three are absent from
this repository.** Only the key is a secret; the address and the model name are ordinary
configuration and live in the ConfigMap, where they can be read back and diffed:

```
kubectl patch configmap imax-model-gateway --type=merge -p '{"data":{
  "MODEL_ENDPOINT":"<gateway base URL, ending in /v1>",
  "MODEL_NAME":"<model served by that gateway>"}}'

kubectl create secret generic imax-model-gateway \
  --from-literal=MODEL_API_KEY='<key>' \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl rollout restart deploy -l part-of=imax-chat-viewer
```

`MODEL_ENDPOINT` must be the base URL **including the version path** — the code appends
`/chat/completions`, so an endpoint that already carries the suffix 404s in a way that
reads like a gateway outage.

`MODEL_NAME` ships as the placeholder `SET-ME`. That is deliberate: the Sponsor's gateway
publishes its own inventory and will not have heard of a commercial model name, so an
unset deployment should fail visibly rather than quietly request something that happens to
exist elsewhere.

**Miss any one of the three and the pods answer from fixtures.** That is the correct
runtime behaviour and a poor deployment signal — a green pod serving mock data looks
exactly like a green pod serving real translations. The two pods that call the gateway
say which they are on their first log line:

```
$ kubectl logs deploy/imax-mock-translation | head -2
imax-mock-translation listening on http://:5177 — TLS off (plaintext; the front terminates)
model gateway off — fixtures (unset: MODEL_API_KEY)
```

Translations produced by the gateway are labelled `<gateway-host>:<model>` in the
gold copy, so an officer can always see which engine answered.

---

## 6. TLS: the enclave root CA

The gateway will present a certificate issued by an internal CA that Node does not
trust. Untrusted TLS surfaces as `UNABLE_TO_VERIFY_LEAF_SIGNATURE` inside a generic
fetch failure, so it looks like the gateway is down rather than untrusted — expect to
be misled by it.

```
./enclave-ca.sh /path/to/enclave-root-ca.pem
```

That creates the `imax-enclave-ca` ConfigMap, sets `NODE_EXTRA_CA_CERTS` to the
mounted path, restarts the pods, and prints a verification command. Both halves must
land together, which is why it is one script.

The pods mount the ConfigMap `optional: true`, so a deployment without it is
unaffected — this is purely additive.

**We do not hold this certificate.** It has to come from the enclave; on the systems
we have seen it is installed in the host trust store rather than distributed as a
file, so plan on extracting it there (`/etc/ssl/certs/ca-bundle.crt` or the output of
`openssl s_client -showcerts -connect <gateway-host>:443`).

Egress from the pods to the gateway may also need a NetworkPolicy — that is the
enclave's call, not something the manifests can assume (see §8).

---

## 7. Triage

| Symptom | Cause | Fix |
|---|---|---|
| Icons show as words (`delete_outline`) | Font files missing from the bundle | Bad build — do not reconfigure, re-cut the bundle from a green CI run |
| Pods `ImagePullBackOff` | Bare image name resolving to Docker Hub | §3 — load on nodes, or set the registry prefix |
| Pods `CreateContainerConfigError` | Referenced ConfigMap/Secret genuinely missing | Both are `optional: true`; if this appears, a manifest was edited |
| App loads, translation returns fixture text | Gateway not configured — expected default | §5, then check `kubectl logs deploy/imax-mock-translation` for the service label |
| `FAIL UNABLE_TO_VERIFY_LEAF_SIGNATURE` | Gateway TLS not trusted | §6 — wrong or missing CA |
| `FAIL ENOTFOUND` / `ECONNREFUSED` | DNS or egress policy, **not** TLS | Enclave networking; confirm the pods are permitted to reach the gateway |
| `Pending` pods, no events | No node capacity or a taint | `kubectl describe pod` — infrastructure, not this package |
| Pods restart-loop after the TLS overlay | Probes still plaintext against a TLS port | The overlay sets `scheme: HTTPS`; if you hand-edited, restore it (§10) |
| Rollout stops, `imax-tls` not found | Certificate Secret missing | Deliberate — create it before applying the overlay (§10) |
| Pod exits at startup, `TLS certificate unreadable` | Wrong path or key in the Secret | Keys must be `tls.crt`, `tls.key`, `ca.pem`; failing loudly beats serving plaintext |
| `502 upstream unavailable` after enabling TLS | Certificate lacks the in-cluster service names as SANs | Logs name the code — `UNABLE_TO_VERIFY_LEAF_SIGNATURE` vs `ECONNREFUSED` (§10) |

Collect for any support round-trip:

```
kubectl get pods,svc -l part-of=imax-chat-viewer -o wide
kubectl describe deploy -l part-of=imax-chat-viewer
kubectl logs -l part-of=imax-chat-viewer --tail=100 --prefix
```

---

## 8. Open questions for the Sponsor

Answers to these change the transfer, so they are worth asking **before** the first
attempt rather than discovering after it:

1. **Ferried images or yard-built?** (§2) If yard-built, we need the internal npm
   registry's host for `NPM_REGISTRY`.
2. **Which base images are approved**, and what are their references?
3. **Is there an in-enclave container registry** we should target, or do images get
   loaded onto nodes directly? (§3)
4. **How do we obtain the root CA** for the model gateway? (§6)
5. **Is pod egress to the gateway permitted by default**, or does it need a
   NetworkPolicy?
6. **What claim names does the STS identity token carry**, and what group should gate this
   bench? (§9) The mechanism is settled — the front sends the identity token in
   `Authorization` and the access token in `x-auth-request-access-token`, with no path
   around it — so what remains is the claim names and the group. `/api/whoami` answers the
   first in one request against a real token; correcting it is a ConfigMap edit.
7. **Is pod-to-pod traffic required to be TLS, or only the ingress hop?** (§10) Both are
   supported and both are proven on a cluster; we need to know which to hand over, and
   who issues a certificate valid for the in-cluster service names.
8. **The certificate secrets, and the role that reads them.** (§10, option B) We need the
   secret names or ARNs, the regional Secrets Manager and STS endpoints, and a role our
   ServiceAccount may assume with `secretsmanager:GetSecretValue` on those secrets — plus
   `kms:Decrypt` if they use a customer-managed key. The policy to attach is in
   `k8s/serviceaccount.yaml`. Both secret layouts and both payload formats are handled, so
   this is configuration rather than a code change.
9. **Does the acceptance suite need to run inside?** The 72-spec Playwright suite
   needs a Chromium binary, which the bundle does not carry. If in-enclave execution
   is required, say so and we will ship the browser; otherwise acceptance testing
   runs low-side and the in-cluster smoke is what runs here.

---

## 9. Caller identity, and the assumption underneath it

The enclave front authenticates the user; the SPA pod reads the identity it forwards,
republishes it at `GET /api/whoami`, shows the officer in the toolbar, and attributes
their notes in the gold copy. The SPA authenticates nobody.

Fronts differ in *how* they forward identity, so the mode is configuration —
`k8s/auth.yaml`:

| `AUTH_MODE` | Identity comes from | Use when |
|---|---|---|
| `disabled` (default) | parsed and displayed, nothing enforced | demonstrating without a front |
| `proxy-header` | flat headers (`x-ain`, `x-name`, …) | the front sends discrete headers |
| `bearer-jwt` | **claims in the token the front forwards** | **the target environment** |

**the target environment is `bearer-jwt`.** Its front is oauth2-proxy in front of the STS, and it sends
two tokens rather than flat headers:

```
Authorization: Bearer <STS identity token>     ← who the caller is; claims read from here
x-auth-request-access-token: <STS access token>  ← read, attached to the request, unused
```

The access token is captured but deliberately not used: the model gateway authenticates
with its own `MODEL_API_KEY`, not as the end user. The plumbing exists if that changes.

| Key | Default | Applies to |
|---|---|---|
| `AUTH_HEADER_ID` / `_NAME` / `_GROUPS` / `_ORG` | `x-ain`, `x-name`, `x-ismemberof`, `x-org` | `proxy-header` |
| `AUTH_HEADER_TOKEN` | `authorization` | `bearer-jwt` |
| `AUTH_CLAIM_ID` / `_NAME` / `_GROUPS` / `_ORG` | `sub`, `name`, `groups`, `org` | `bearer-jwt` |
| `AUTH_GROUP_SEPARATOR` | `,;` | both (a groups **array** is also accepted) |
| `AUTH_REQUIRED_GROUPS` | *(empty)* | both; caller must hold ANY one |

Turn it on in the enclave:

```
kubectl patch configmap imax-auth --type=merge -p '{"data":{
  "AUTH_MODE":"bearer-jwt",
  "AUTH_REQUIRED_GROUPS":"<the group that should have this bench>"}}'
kubectl rollout restart deploy/imax-spa
```

**The claim names above are the common OIDC spellings, not confirmed against the Sponsor's
STS.** Every deployment publishes its own. This is the fastest way to find out, because
`/api/whoami` reports the claim names the token actually carried alongside the four the
pod is configured to look for:

```
kubectl port-forward svc/imax-spa 8443:8443
curl -s http://localhost:8443/api/whoami -H "Authorization: Bearer <a real token>" \
  | python3 -m json.tool
```

```json
"claims":            {"id": "sub", "name": "name", ...},        ← what we look for
"claimNamesPresent": ["aud", "exp", "preferred_username", ...], ← what arrived
"signatureVerified": false
```

If `sub` is absent and `preferred_username` is present, the fix is
`AUTH_CLAIM_ID=preferred_username` and a rollout — not a rebuild. Claim **names** are
reported and claim **values** never are; this endpoint is a diagnostic, not a token dump.

`401` means either no token arrived under `AUTH_HEADER_TOKEN` or the token carried no id
claim — the two are reported differently, because a missing oauth2-proxy flag and a wrong
claim name are different problems. `403` means the caller arrived but holds none of the
required groups. `/healthz` is always exempt; a probe carries no identity and gating it
would restart the pod forever.

The pod states its mode and its trust posture on startup:

```
auth mode: bearer-jwt (token header "authorization", id claim "sub") — signature NOT
verified; the front is trusted, see AIRGAP.md §9
```

### What this rests on

These headers are trusted absolutely — anyone who could open a socket directly to the SPA
pod could assert any identity, including group membership. That is the standard
proxy-header model, and it is safe under exactly one condition: the pod is unreachable
except through the authenticating front.

**In the target environment that condition holds architecturally.** The front handles security and
the STS headers, and there is no path around it — confirmed by River Hawk, 2 August.
So proxy-header mode is sound here, and `AUTH_REQUIRED_GROUPS` is a real control rather
than decoration.

Worth stating anyway, because it travels: if this application is ever deployed somewhere
the front can be bypassed, this authentication is worth nothing. It is a property of the
platform, not of the code.

---

## 10. TLS everywhere

The base manifests deploy plaintext behind a TLS-terminating front, which is right when
that front is the only encrypted hop. If security requires **every** connection to be
TLS — ingress and pod-to-pod — apply the overlay instead. Same images; no rebuild.

### 1. Get a certificate

It must be valid for every name that gets dialled: the in-cluster service names
`imax-mock-search`, `imax-mock-translation`, `imax-mock-entities`, `imax-mock-summarize`,
`imax-mock-ocr`, plus whatever name the front uses for `imax-spa`. A SAN list covering
all six, or a namespace wildcard the enclave PKI will issue, is the usual answer.

### 2. Get the material to the pods — pick one

There are two overlays. They reach the **same running state**; they differ only in
where `/etc/tls` comes from. Certificate material never lives in the repository under
either.

#### Option A — a Secret someone creates (`deploy/overlays/tls`)

Right when a person has PEM files in hand. This is what CI exercises.

```
kubectl create secret generic imax-tls \
  --from-file=tls.crt=<server cert or chain>.pem \
  --from-file=tls.key=<server key>.pem \
  --from-file=ca.pem=<enclave root CA>.pem
kubectl apply -k deploy/overlays/tls
```

#### Option B — AWS Secrets Manager (`deploy/overlays/tls-awssm`)

**This is the target environment path.** The target environment is an automated Kubernetes
environment on AWS: nobody runs `kubectl create secret`, and the certificates live in Secrets Manager
behind a role the environment grants us. An initContainer in every pod reads the material
at start and stages it on an in-memory volume (`emptyDir: {medium: Memory}`), so the
private key never touches a node's disk and never exists as a Kubernetes Secret.

`deploy/tls.js` is unchanged and unaware. It still reads PEM files from `/etc/tls`; only
the thing that fills `/etc/tls` is different.

```
kubectl apply -k deploy/overlays/tls-awssm
kubectl patch configmap imax-tls-source --type=merge -p '{"data":{
  "AWS_SECRETSMANAGER_ENDPOINT":"<regional endpoint URL>",
  "AWS_STS_ENDPOINT":"<regional STS endpoint URL>",
  "TLS_CERT_SECRET":"<certificate secret>",
  "TLS_KEY_SECRET":"<key secret, or empty if one secret holds both>",
  "TLS_CA_SECRET":"<CA secret, optional>"}}'
kubectl rollout restart deploy -l part-of=imax-chat-viewer
```

**Both secret layouts work, and so do both payload formats.** We do not control how the
Sponsor's secrets were authored, so the reader accommodates what it finds:

| The secrets are… | Set |
|---|---|
| cert and key in **separate** secrets | `TLS_CERT_SECRET` and `TLS_KEY_SECRET` |
| cert and key in **one** secret | `TLS_CERT_SECRET` only; leave `TLS_KEY_SECRET` empty |
| raw PEM | nothing extra — detected |
| a JSON object | nothing extra — keys matched against the usual spellings (`tls.crt`/`cert`/`certificate`/`crt`, `tls.key`/`key`/`privateKey`, `ca.pem`/`ca`/`chain`) |
| binary (`SecretBinary`) | nothing extra — base64-decoded, then re-checked |

When it cannot make sense of a secret it names that secret and lists the keys it did
find, rather than failing later as a TLS handshake error.

**What the environment owner has to grant.** A role this pod's ServiceAccount (`imax`)
may assume, allowed `secretsmanager:GetSecretValue` on those specific secrets and nothing
wider. The policy to ask for, and the IRSA annotation to fill in, are in
`deploy/k8s/serviceaccount.yaml`. If the secrets use a customer-managed KMS key the role
also needs `kms:Decrypt` on it — worth asking up front, because that failure presents as
`AccessDeniedException` on a secret the role can demonstrably see.

Credentials resolve in this order, so IRSA and a node instance profile both work with no
change to these manifests: IRSA web identity → `AWS_ACCESS_KEY_ID` environment →
IMDSv2 instance profile.

### 3. Apply the overlay

```
kubectl apply -k deploy/overlays/tls          # or overlays/tls-awssm
kubectl rollout status deploy -l part-of=imax-chat-viewer --timeout=180s
```

That mounts the Secret at `/etc/tls` in all six pods, sets `TLS_CERT_FILE` /
`TLS_KEY_FILE` / `TLS_CA_FILE`, sets `UPSTREAM_SCHEME=https` so the SPA edge dials the
enrichment pods over TLS, and **flips the probes to `scheme: HTTPS`** — without that last
part the kubelet health-checks a TLS port in plaintext and restarts every pod forever.

### 4. Verify

```
kubectl port-forward svc/imax-spa 8443:8443
curl -sf --cacert <ca>.pem https://localhost:8443/healthz
curl -sf --cacert <ca>.pem https://localhost:8443/api/search/threads | head -c 200
curl -s  http://localhost:8443/healthz     # must FAIL — no plaintext on a TLS port
```

The pod logs its posture at startup, so `kubectl logs deploy/imax-spa | head -3` answers
"is TLS actually on" without guesswork:

```
imax-spa listening on https://:8443 — TLS on (cert /etc/tls/tls.crt, CA /etc/tls/ca.pem)
upstream scheme: https
auth mode: proxy-header (id header "x-ain")
```

### Mutual TLS

If the enclave requires clients to present certificates, set `TLS_CLIENT_AUTH=require`
in the overlay's `imax-tls-config`. Callers must then hold a certificate signed by
`ca.pem`. Default is `none` — the front does client authentication in the usual
deployment.

### Notes

- **The Secret is not optional in this overlay.** If it is missing the rollout stops,
  rather than a pod coming up in plaintext on a port the cluster believes is encrypted.
- **A bad certificate path kills the process at startup** for the same reason — a silent
  downgrade to plaintext is the worst available outcome.
- **The same rule holds for Option B.** If the initContainer cannot fetch or cannot make
  sense of the material it exits non-zero, the pod holds in `Init:Error`, and the old
  pod keeps serving. There is no path where a missing certificate produces a running pod.
- `deploy/tls.js` is shared by both entrypoints, so there is no separate "TLS build" and
  no way for the two to drift. Option B does not change it.

### Diagnosing Option B

The init container logs the secret name, the shape it detected, and a byte count — never
the material. That is enough to resolve every failure it has:

```
kubectl logs deploy/imax-spa -c fetch-certs
```

| What it says | What it means |
|---|---|
| `credentials: irsa` / `environment` / `instance-profile` | which link of the chain answered — if this is not what you expect, the rest will mislead |
| `AccessDeniedException` | the role lacks `GetSecretValue` on that secret, or `kms:Decrypt` on its key |
| `ResourceNotFoundException` | wrong name, or the right name in the wrong region |
| `ENOTFOUND` / connect timeout | `AWS_SECRETSMANAGER_ENDPOINT` unset or wrong, or no VPC endpoint / route to it |
| `AssumeRoleWithWebIdentity failed` | the role's trust policy does not name this cluster's OIDC provider, namespace and ServiceAccount |
| `neither PEM nor JSON` | almost always DER; the message carries the `openssl` conversion command |
| `carries none of the expected keys` | a JSON secret under key names we do not recognise — the message lists the ones it found |
| `TLS_KEY_SECRET is unset … no private key block` | one-secret layout assumed, but that secret holds only the certificate |

---

## 11. What we have and have not proven

**Proven, on every push:** the six images build, pass a trivy CRITICAL gate, deploy to a
Kubernetes cluster from these exact manifests, roll out, and serve the full proxy chain —
including the vendored font files — end to end. Then the *same images* are redeployed
through the TLS overlay with a generated certificate and re-smoked over https, including
a check that the TLS port refuses plaintext.

**Not proven:** any of it inside the target environment. Admission policy, registry gating, ingress,
network policy, the CA, and the model gateway are all unexercised until we have access.
Identity resolution is unit-tested and smoke-tested with synthetic headers, but it has
never seen the real front. The cluster claim is real; the target environment claim is not one we
make.
