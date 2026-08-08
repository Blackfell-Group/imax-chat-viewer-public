{{/*
Shared fragments. The TLS pieces live here rather than being repeated in the
six workloads: getting them subtly different between the SPA and the mocks is
exactly the drift that a single shared deploy/tls.js exists to prevent, and the
same reasoning applies to the manifests that configure it.
*/}}

{{- define "imax.labels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
part-of: imax-chat-viewer
{{- end }}

{{/* Fully-qualified image reference for one component. */}}
{{- define "imax.image" -}}
{{- printf "%simax-%s:%s" .root.Values.image.registry .name .root.Values.image.tag -}}
{{- end }}

{{/*
Pod securityContext. fsGroup only appears when an initContainer has to write
the fetched certificate: the images run as a non-root UID and an emptyDir is
owned by root, so without it the fetch succeeds and the WRITE fails with
EACCES — the pod holds in Init:Error having done all the hard parts.
runAsUser stays unpinned so a namespace assigning its own UID range is free to.
*/}}
{{- define "imax.podSecurityContext" -}}
runAsNonRoot: true
seccompProfile:
  type: RuntimeDefault
{{- if and .Values.tls.enabled (eq .Values.tls.source "awssm") }}
fsGroup: {{ .Values.tls.awssm.fsGroup }}
{{- end }}
{{- end }}

{{/* Restricted Pod Security Standard. An enforcing namespace rejects the pod without these. */}}
{{- define "imax.containerSecurityContext" -}}
allowPrivilegeEscalation: false
readOnlyRootFilesystem: false
capabilities:
  drop: ["ALL"]
{{- end }}

{{/* The tls volume: a mounted Secret, or a tmpfs an initContainer fills. */}}
{{- define "imax.tlsVolume" -}}
{{- if .Values.tls.enabled }}
- name: tls
  {{- if eq .Values.tls.source "secret" }}
  secret:
    secretName: {{ .Values.tls.secret.name }}
    # NOT optional: a missing Secret must stop the rollout, never serve
    # plaintext on a port the cluster believes is TLS.
    optional: false
  {{- else }}
  # medium: Memory keeps the private key off the node's disk — it lives in a
  # tmpfs that dies with the pod, and never becomes a Kubernetes Secret.
  emptyDir:
    medium: Memory
  {{- end }}
{{- end }}
{{- end }}

{{- define "imax.tlsVolumeMount" -}}
{{- if .Values.tls.enabled }}
- name: tls
  mountPath: /etc/tls
  readOnly: true
{{- end }}
{{- end }}

{{/*
The initContainer that reads certificates from Secrets Manager. Runs from the
component's OWN image, so there is no second image to build, scan or ferry, and
the staging code is version-locked to the code that will read it.
*/}}
{{- define "imax.certInit" -}}
{{/* Receives a dict, so the root context is .root — not . as in the others. */}}
{{- if and .root.Values.tls.enabled (eq .root.Values.tls.source "awssm") }}
initContainers:
  - name: fetch-certs
    image: {{ include "imax.image" (dict "root" .root "name" .name) }}
    imagePullPolicy: {{ .root.Values.image.pullPolicy }}
    command: ["node", "/app/secrets-init.js"]
    envFrom:
      - configMapRef:
          name: {{ .root.Release.Name }}-tls-source
      - configMapRef:
          name: {{ .root.Release.Name }}-tls-config
    volumeMounts:
      - name: tls
        mountPath: /etc/tls   # writable here, read-only on the serving container
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop: ["ALL"]
    resources:
      requests: {cpu: 50m, memory: 64Mi}
      limits: {cpu: 200m, memory: 128Mi}
{{- end }}
{{- end }}

{{/*
Probe scheme. Flipping this with TLS is not optional: without it the kubelet
health-checks a TLS port in plaintext and restarts every pod forever.
*/}}
{{- define "imax.probeScheme" -}}
{{- if .Values.tls.enabled }}HTTPS{{- else }}HTTP{{- end }}
{{- end }}
