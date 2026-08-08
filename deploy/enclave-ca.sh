#!/bin/bash
# Install the enclave root CA so the enrichment pods trust the model gateway.
#
#   ./deploy/enclave-ca.sh /path/to/enclave-root-ca.pem [namespace]
#
# Why this is a script and not a committed manifest: the CA is environment
# material and never enters this repository, and the configuration has two
# halves that must land together — the certificate itself and the
# NODE_EXTRA_CA_CERTS path that tells Node to load it. Doing one without the
# other produces a TLS failure that reads like a network outage
# (UNABLE_TO_VERIFY_LEAF_SIGNATURE surfaces as a generic fetch error), so this
# does both and restarts the pods.
#
# Undo:  kubectl delete configmap imax-enclave-ca
#        kubectl patch configmap imax-model-gateway --type=json \
#          -p '[{"op":"remove","path":"/data/NODE_EXTRA_CA_CERTS"}]'
set -euo pipefail

CA="${1:-}"
NS="${2:-default}"
[[ -f "$CA" ]] || { echo "usage: $0 <enclave-root-ca.pem> [namespace]" >&2; exit 1; }

# Reject anything that is not a PEM chain — a DER file here fails silently later.
grep -q 'BEGIN CERTIFICATE' "$CA" || {
  echo "ERROR: $CA does not look like a PEM certificate." >&2
  echo "       Convert DER with: openssl x509 -inform der -in <file> -out ca.pem" >&2
  exit 1
}
echo "==> $(grep -c 'BEGIN CERTIFICATE' "$CA") certificate(s) in $CA"

kubectl -n "$NS" create configmap imax-enclave-ca \
  --from-file=ca.pem="$CA" \
  --dry-run=client -o yaml | kubectl apply -f -

# The mount path is fixed by the Deployments (/etc/ssl/enclave, key ca.pem).
kubectl -n "$NS" patch configmap imax-model-gateway --type=merge \
  -p '{"data":{"NODE_EXTRA_CA_CERTS":"/etc/ssl/enclave/ca.pem"}}'

kubectl -n "$NS" rollout restart deploy -l part-of=imax-chat-viewer
kubectl -n "$NS" rollout status deploy -l part-of=imax-chat-viewer --timeout=120s

echo
echo "CA installed. Verify the gateway is actually reachable and trusted:"
echo "  kubectl -n $NS exec deploy/imax-mock-translation -- node -e \\"
echo "    \"fetch(process.env.MODEL_ENDPOINT+'/models',{headers:{Authorization:'Bearer '+process.env.MODEL_API_KEY}})\\"
echo "     .then(r=>console.log('gateway HTTP',r.status)).catch(e=>console.log('FAIL',e.cause?.code||e.message))\""
echo
echo "  'gateway HTTP 200'                  → trusted and reachable"
echo "  'FAIL UNABLE_TO_VERIFY_LEAF_SIGNATURE' → wrong CA for this gateway"
echo "  'FAIL ENOTFOUND' / 'ECONNREFUSED'   → egress policy or DNS, not TLS"
