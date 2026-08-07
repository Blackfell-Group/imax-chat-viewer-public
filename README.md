# IMAX Chat-Viewer Prototype — source

A single-page application for triaging multi-language intercepted communications, with a
containerized mock service layer standing in for production enrichment services.

**This repository carries source code only.** It exists so the prototype can be imported
into a restricted network. Human-centred design artifacts, guides, test-results reports,
project artifacts and the acceptance package are delivered directly to the customer and are
deliberately not published here.

Unclassified throughout. The entire demonstration corpus is fabricated: every name, handle,
number, location and document is fictional, and the application renders an UNCLASSIFIED
banner on every screen.

## Run it

```sh
npm install && npm --prefix angular install
npm run dev:ng            # mock services on :5177, application on :4200
```

## Test it

```sh
npm run test:ng           # end-to-end, Angular build (49 specs)
npm test                  # end-to-end, React reference build (16 specs)
npm test --prefix angular # Angular unit specs (10)
npm run test:node         # identity, SigV4, certificate handling (59)
```

## Deploy it

Six images — one application host, five single-responsibility enrichment services.

```sh
./deploy/build-images.sh 0.1.0
kubectl apply -k deploy/k8s
```

- `deploy/README.md` — deployment procedure, configuration, production cutover
- `deploy/AIRGAP.md` — transfer into a restricted network, offline bundle, failure triage
- `deploy/chart/` — Helm chart, proven equivalent to the kustomize manifests by a CI check

## What is here

| Path | |
|---|---|
| `angular/` | The delivered single-page application (Angular 21, pinned) |
| `src/` | The earlier React implementation, retained unmodified as a reference build |
| `routes/`, `providers/`, `server.js` | Mock enrichment services behind schema-pinned contracts |
| `data/`, `static/` | Fabricated demonstration corpus and document scans |
| `deploy/` | Dockerfiles, Kubernetes manifests, Helm chart, transfer runbooks |
| `tests/` | End-to-end and unit specifications |
| `scripts/` | Air-gap preflight, font vendoring, image rasterization, report generation |

CI re-proves the chain on every push: lint → production build → unit → end-to-end → image
builds → vulnerability scan → cluster deploy → in-cluster smoke.
