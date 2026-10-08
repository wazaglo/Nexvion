# NEXVION — DevOps architecture

How the NEXVION storefront is built, shipped and run. The application source at
the repository root is provided and has never been modified; everything here is
infrastructure wrapped around it.

---

## 1. What the application actually is

Read this first, because it determines almost every decision below.

```
index.html      home page
products.html   catalogue with filters
payment.html    checkout
script.js       catalogue, cart, and demo authentication
payment.js      checkout form validation
*.css           styles
logo.png        brand asset
```

There is **no backend, no API, no database, and no build step upstream.** The
"login" and "payment" flows are client-side demo logic backed by `localStorage`
— `script.js:164-182` and `payment.js:300-319`. No card number ever leaves the
browser.

The consequence for a DevOps engineer: **there is no server-side behaviour to
secure.** The security work is entirely about *how the bytes are delivered* —
transport, headers, image provenance, container isolation — not about a
transaction pipeline.

---

## 2. Topology

```
                       Internet
                          │
                    Route 53  (not yet configured)
                          │
                   ┌──────┴───────┐
                   │  ACM cert     │  us-east-1, must match the ALB region
                   └──────┬───────┘
                          │ HTTPS :443
        ┌─────────────────┴──────────────────┐
        │  Application Load Balancer        │
        │  internet-facing · 2 AZs           │
        │  ALB rule: path routing           │
        └───┬───────────┬───────────┬───────┘
     /payment  /logo.png      /*
        │           │           │
   ┌────▼───┐  ┌────▼────┐  ┌───▼──────────┐
   │checkout│  │ assets  │  │ storefront   │   ← separate Deployments
   └────┬───┘  └────┬────┘  └───┬──────────┘
        │           │           │
        └───────────┴───────────┘
                    │
            Fargate pods (micro-VMs)
            private subnet 10.0.32.0/24
            no EC2 nodes anywhere
                    │
                    ▼
            NAT gateway ──► ECR (image pulls)
```

### Why one ALB for three services

The provided HTML links its pages with **relative** paths:

```
index.html  ↔  products.html  ↔  payment.html
```

plus `src="logo.png"` on all three. Those links only resolve correctly when
everything is served from a **single origin**.

Three separate Ingress objects would make the controller create three load
balancers, each with its own origin. The pages would then cross origins and
every relative link would break — which could only be fixed by editing the
provided HTML. Path routing on one Ingress avoids the problem entirely and
required **zero** changes to application source.

| Path | Backend | `pathType` |
|---|---|---|
| `/payment.html` | checkout | Exact |
| `/logo.png` | assets | Exact |
| `/*` | storefront | Prefix |

---

## 3. Images

Three images, built by three Dockerfiles that share `docker/common/`.

| Image | Contents | Dockerfile |
|---|---|---|
| `nexvion-storefront` | `index.html`, `products.html`, `script.js`, `style.css`, `products.css` | `docker/storefront/Dockerfile` |
| `nexvion-checkout` | `payment.html`, `payment.js`, `payment.css`, `style.css` | `docker/checkout/Dockerfile` |
| `nexvion-assets` | `logo.png` | `docker/assets/Dockerfile` |

`assets` has a **two-stage** build: there is nothing to minify, so pulling in a
Node toolchain to copy one PNG would double the build time and widen the build
attack surface for nothing.

### Hardening applied at build time

| Concern | Implementation |
|---|---|
| Non-root | `USER 101:101` — never root, so there is no privilege to drop |
| No fingerprinting | `server_tokens off` |
| Log shipping | JSON access log on stdout, errors on stderr |
| Read-only FS | PID and all temp paths under `/tmp` |
| Graceful shutdown | `STOPSIGNAL SIGQUIT`, `exec` so nginx is PID 1 |
| Build integrity | asset-integrity checks fail the build (below) |

### Optimisation is verified, not assumed

`common/build/minify.mjs` reduces assets by **23-25%** and then asserts:

1. every `id="…"` in each document survives minification
2. every `localStorage` key is discovered from source and asserted against its
   own output
3. no output is empty, and the key extractor must actually match something

This caught two real defects: the base image's "Welcome to nginx!" page leaking
into two images, and an incorrect hardcoded key list. Losing a storage key
silently logs shoppers out and empties baskets — invisible in a screenshot.

---

## 4. Kubernetes

Release: `nexvion`, chart in `helm/nexvion/`, 15 objects.

### Security context — every pod

```yaml
pod:        runAsNonRoot: true, runAsUser: 101, fsGroup: 101,
            seccompProfile: { type: RuntimeDefault }
container:  allowPrivilegeEscalation: false, readOnlyRootFilesystem: true,
            capabilities: { drop: ["ALL"] }
            automountServiceAccountToken: false
```

Verified live — `kubectl exec` reports uid **101** in all six pods.

The `emptyDir` at `/tmp` is **load-bearing**: the images run uid 101 on a
read-only root filesystem and nginx writes `nginx.pid` there. Without that
volume every container starts and immediately dies.

### Availability

- `replicas: 2` with rolling updates at `maxUnavailable: 0`
- **PDB** `minAvailable: 1` — a drain cannot take a whole service down
- **HPA** `2-4` on CPU at 70% — scale-up reacts in 30s, scale-down holds for
  5 minutes to avoid flapping

### Fargate-specific decisions

| Decision | Reason |
|---|---|
| `target-type: ip` | Fargate pods have no node IP to register; `instance` mode silently hangs targets in `initializing` |
| `namespace: nexvion` hardcoded | pods only schedule under a matching Fargate profile; an accidental install into `default` leaves them `Pending` with a taint error |
| no `topologySpreadConstraints` | unsupported on Fargate |
| images by `@sha256:` digest | tags are mutable by definition |

### What does not work on Fargate

**NetworkPolicy does not enforce.** Fargate does not run the VPC CNI, so there is
no policy engine. For L7 filtering at the edge, use **AWS WAF on the ALB**. Worth
knowing before claiming network-level isolation.

---

## 5. Registry

Three private ECR repositories, immutable tags, AES-256, scan-on-push.

```
nexvion-storefront  sha256:89f82b01…
nexvion-checkout    sha256:115dbfec…
nexvion-assets      sha256:b72514ba…
```

**Push with `--provenance=false`.** Under Docker 29 the default build attaches a
BuildKit provenance attestation, so the artifact publishes as an OCI **image
index**. ECR's basic scanner rejects that type:

```
UnsupportedImageTypeException: An artifact with media type
'application/vnd.oci.image.index.v1+json' cannot be scanned.
```

Worse, **scan-on-push fails silently** — the repository reports no findings and
no error, which reads as "my image is clean" when nothing was ever scanned.
Adding `--provenance=false` yields a single manifest the scanner accepts.

---

## 6. IAM

| Role | Purpose |
|---|---|
| `nexvion-fargate-pod-exec` | pulls images from ECR, ships logs. Trust principal is `eks-fargate-pods.amazonaws.com`, **not** `eks.amazonaws.com` |
| `nexvion-albc` | the load balancer controller, bound via IRSA |

See `iam/README.md` for the trust policies, the `sub` pin, and the IRSA
registration steps.

---

## 7. Observability

Control-plane logs enabled for all five types. Fargate pod stdout is shipped to
CloudWatch Logs via the `aws-logging` ConfigMap:

```
log group: /aws/eks/nexvion-demo/fargate   retention 30 days
```

The nginx access log is **JSON on stdout** by design, so the log pipeline needs
no parsing. Each line carries `request_id`, which correlates an ALB access-log
entry, a container log line and a request.

`/healthz`, `/readyz`, `/version.json` and `/nginx_status` are exposed on every
service. The probe endpoints are `access_log off`, so kubelet's 10-second polls
never pollute request metrics.

---

## 8. Evidence

Live captures from the running deployment are in:

```
docs/screenshots/     the site rendered in a real browser
docs/evidence/        cluster, AWS, HTTP, security and test output
```

---

## 9. Honest limitations

1. **No HTTPS yet.** The ALB serves HTTP only; no ACM certificate has been
   requested. `ingress.host` and `ingress.certificateArn` are the two values
   needed.
2. **No domain.** The ALB is reachable on its AWS DNS name, not a friendly URL.
3. **`NetworkPolicy` does not enforce** on Fargate (see §4).
4. **No CI pipeline yet.** Images are built and pushed by hand; the GitHub
   Actions workflow is the obvious next step.
5. **`style.css` is duplicated** into two images. At 12 KB that is pragmatic, but
   a versioned shared package is the correct fix.
6. **Demo auth is not real.** `localStorage` accounts are not authentication.