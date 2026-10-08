{{/*
================================================================================
NEXVION — shared template helpers
================================================================================
Naming, labels, and the security-context blocks used by all three services.
Everything here is a pure function so a template can compose them without
repeating literals.
*/}}

{{- define "nexvion.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "nexvion.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{- define "nexvion.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "nexvion.selectorLabels" -}}
app.kubernetes.io/name: {{ include "nexvion.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "nexvion.labels" -}}
helm.sh/chart: {{ include "nexvion.chart" . }}
{{ include "nexvion.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "nexvion.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "nexvion.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Per-service resource name. Accepts a dict so it can be called from inside a
range loop over .Values.services.
Usage: {{ include "nexvion.svcName" (dict "root" $ "svc" "storefront") }}
*/}}
{{- define "nexvion.svcName" -}}
{{- printf "%s-%s" (include "nexvion.fullname" .root) .svc | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "nexvion.svcLabels" -}}
{{ include "nexvion.labels" .root }}
app.kubernetes.io/component: {{ .svc }}
{{- end }}

{{- define "nexvion.svcSelectorLabels" -}}
{{ include "nexvion.selectorLabels" .root }}
app.kubernetes.io/component: {{ .svc }}
{{- end }}

{{/*
Fully-qualified image reference: registry/repository@digest

Digest pinning, never a tag. The tag is not included even though one exists in
ECR, because tags are mutable by definition.
*/}}
{{- define "nexvion.image" -}}
{{- printf "%s/%s@%s" .root.Values.global.imageRegistry .cfg.image.repository .cfg.image.digest }}
{{- end }}

{{/*
--------------------------------------------------------------------------------
Pod-level security context.
--------------------------------------------------------------------------------
runAsNonRoot + an explicit non-zero uid means the kubelet refuses to start the
container if the image ever resolves to root, so a compromised or misbuilt base
image cannot silently gain root inside the pod.

seccompProfile RuntimeDefault blocks the ~44 legacy syscalls that were the basis
of most container escapes (ptrace, mount, keyctl).

The fsGroup is needed because nginx writes its pid file and temp paths under
/tmp, which is a read-only root filesystem here.
*/}}
{{- define "nexvion.podSecurityContext" -}}
runAsNonRoot: true
runAsUser: {{ .root.Values.podSecurityContext.runAsUser }}
runAsGroup: {{ .root.Values.podSecurityContext.runAsGroup }}
fsGroup: {{ .root.Values.podSecurityContext.runAsGroup }}
seccompProfile:
  type: RuntimeDefault
{{- end }}

{{/*
--------------------------------------------------------------------------------
Container-level security context.
--------------------------------------------------------------------------------
readOnlyRootFilesystem + allowPrivilegeEscalation:false + drop:ALL is the
combination that leaves a container with no writable path outside its own
emptyDir volume and no retained privilege between calls. With allowPrivilege
escalation disabled, a setuid binary inside the image cannot regain privilege.
*/}}
{{- define "nexvion.containerSecurityContext" -}}
allowPrivilegeEscalation: false
readOnlyRootFilesystem: true
privileged: false
runAsNonRoot: true
runAsUser: {{ .root.Values.podSecurityContext.runAsUser }}
capabilities:
  drop:
    - ALL
{{- end }}

{{/*
Probe definitions shared by every service. The images expose /healthz and
/readyz; they are deliberately access_log off so kubelet probe traffic every
10s per pod never pollutes the request metrics or the ALB access log.
*/}}
{{- define "nexvion.livenessProbe" -}}
httpGet:
  path: /healthz
  port: http
  scheme: HTTP
initialDelaySeconds: 5
periodSeconds: 10
timeoutSeconds: 2
failureThreshold: 3
{{- end }}

{{- define "nexvion.readinessProbe" -}}
httpGet:
  path: /readyz
  port: http
  scheme: HTTP
initialDelaySeconds: 3
periodSeconds: 5
timeoutSeconds: 2
failureThreshold: 3
{{- end }}