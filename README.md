# NEXVION — DevOps Capstone

Infrastructure around the provided NEXVION storefront. The nine application files
at the repository root are **unmodified** — `git diff` against the original
upstream commit is empty.

| Document | What it covers |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | topology, images, Kubernetes, security, IAM, observability |
| [`docs/INCIDENTS.md`](docs/INCIDENTS.md) | the failures hit while building this, and what each one actually meant |
| [`docs/SCREENSHOTS.md`](docs/SCREENSHOTS.md) | the running site in a browser |
| [`docker/README.md`](docker/README.md) | the container images and their hardening |
| [`iam/README.md`](iam/README.md) | the two IAM roles and how they are bound |
| [`docs/evidence/`](docs/evidence/) | raw captured output from the live deployment |

---

## What was built

**Three container images** from one static site, split by domain so each has its
own release cadence, resource limits, replica count and security boundary:

```
nexvion-storefront   home + catalogue      2/2 running
nexvion-checkout     delivery + payment    2/2 running
nexvion-assets       brand binaries        2/2 running
```

All three behind **one** Application Load Balancer using path routing
(`/payment.html` → checkout, `/logo.png` → assets, `/*` → storefront). That
single-origin property is what lets the application's relative links keep
working without editing the provided HTML.

**EKS 1.36 on AWS Fargate** — no EC2 worker nodes. Six pods, each running as
uid 101 on a read-only root filesystem with all capabilities dropped.

**Zero application changes.** Verified by `git diff b74f5b0..HEAD` returning
empty for every app file.

---

## Running it

```bash
# build and push (note --provenance=false; see docker/README.md)
docker build --provenance=false --platform linux/amd64 \
  -f docker/storefront/Dockerfile -t nexvion-storefront:0.1.1 .
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin \
  195675606509.dkr.ecr.us-east-1.amazonaws.com
docker push --platform linux/amd64 \
  195675606509.dkr.ecr.us-east-1.amazonaws.com/nexvion-storefront:0.1.1

# deploy
helm upgrade --install nexvion ./helm/nexvion -n nexvion -f helm/nexvion/values-dev.yaml

# verify
kubectl -n nexvion get deploy,pods,svc,ingress
```

Images are pinned in `values.yaml` by `@sha256:` digest, never by tag.

---

## Design decisions worth defending

**Path routing on one Ingress, not three Ingress objects.** The HTML links its
pages with relative paths, so all three services must share one origin. Three
Ingresses would create three ALBs and break every link, which could only be fixed
by editing the application.

**`target-type: ip`.** Fargate pods have no node IP. The default `instance` mode
leaves targets stuck in `initializing` with no useful error.

**An `emptyDir` at `/tmp`.** The images run uid 101 on a read-only root
filesystem and nginx writes its pid file there. Without it every container
starts and dies immediately.

**Digest pinning, not tags.** Tags are mutable by definition; a digest makes a
deployment reproducible byte-for-byte.

**Requests sized to need, not comfort.** Fargate bills the *request*, rounded up
to the smallest available task. `50m`/`64Mi` rounds to 0.25 vCPU / 0.5 GB
(~$9/pod/month). A "safe" `500m`/`512Mi` would provision 1 vCPU / 2 GB (~$36) —
4× the cost to serve static files.

---

## Verified, not assumed

| Claim | How it was checked |
|---|---|
| six pods healthy | `kubectl get deploy` — all `2/2` |
| running as non-root | `kubectl exec … id -u` returns **101** in every pod |
| path routing correct | `/version.json` returns the storefront payload; `/payment.html` returns checkout HTML; `/logo.png` returns a PNG |
| minified bundle still works | 15 functional assertions against the live ALB in a real DOM — cart maths, localStorage, auth, checkout gating |
| images are minified | served `script.js` is 14,590 bytes vs 20,138 in the repo (28% smaller) |
| all six pods registered | `describe-target-health` — 2 healthy per target group |
| ALB is internet-facing | `State.Code: active`, `Scheme: internet-facing` |

---

## Honest limitations

1. **No HTTPS and no domain.** No ACM certificate was requested. The ALB serves
   HTTP on its AWS-assigned hostname. `ingress.host` and `ingress.certificateArn`
   are the two missing values.
2. **`NetworkPolicy` does not enforce on Fargate** — Fargate does not run the
   VPC CNI. AWS WAF on the ALB is the substitute for L7 filtering.
3. **No CI pipeline.** Images are built and pushed by hand. GitHub Actions is the
   obvious next step and the largest remaining gap.
4. **Demo auth is not authentication.** Accounts live in `localStorage`.
5. **`style.css` is duplicated** into two images; a versioned shared package is
   the correct fix.
6. **No cost alarm.** Fargate bills per second. A *daily* budget is the right
   control — the fixed baseline is already ~$145/month, so a low *monthly* alarm
   would fire every month and be ignored.

---

## Cost

| Item | Monthly |
|---|---|
| EKS control plane | $73 |
| NAT gateway | $33 |
| 6 Fargate pods (2 × 3 services) | $54 |
| ALB | $16 |
| **Total** | **≈$176** |

The NAT gateway is the item most easily forgotten — it outlives the cluster and
will keep billing after `helm uninstall`.

---

## Repository layout

```
├── index.html, products.html, payment.html   application — unmodified
├── script.js, payment.js, *.css, logo.png    application — unmodified
├── .dockerignore                             build-context allowlist
├── docker/
│   ├── storefront/checkout/assets/           one Dockerfile per service
│   └── common/                               shared nginx + build tooling
├── helm/nexvion/                             chart + values-{dev,staging,prod}
├── iam/README.md                             role reference
└── docs/
    ├── ARCHITECTURE.md  INCIDENTS.md  SCREENSHOTS.md
    ├── screenshots/                          browser captures
    └── evidence/                             raw live output
```