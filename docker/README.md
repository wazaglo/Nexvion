# NEXVION — container images

Three independently deployable service images for the NEXVION storefront, plus
the shared web-server and build tooling they have in common.

The application source at the repository root (`index.html`, `products.html`,
`payment.html`, `script.js`, `payment.js`, `style.css`, `products.css`,
`payment.css`, `logo.png`) is **provided and never modified**. Every byte in
these images originates from those files, is transformed without altering
behaviour, and is verified before the build is allowed to succeed.

---

## Service decomposition

| Image | Owns | Files shipped |
|---|---|---|
| `nexvion-storefront` | Home page and product catalogue | `index.html`, `products.html`, `script.js`, `style.css`, `products.css` |
| `nexvion-checkout` | Delivery details and payment step | `payment.html`, `payment.js`, `payment.css`, `style.css` |
| `nexvion-assets` | Brand binaries | `logo.png` |

### Why this split

The three pages have genuinely different operational profiles:

- **checkout** is the only surface that collects an address, phone number, PIN
  and card fields. It gets its own NetworkPolicy, resource limits, replica
  count and WAF rules, so a traffic spike or a bad release against browsing
  cannot affect it. It also has a different release cadence — the storefront
  changes with merchandising, checkout changes with compliance — so they do not
  belong in one atomic release.
- **assets** serves binaries only. It has no session, no form and no user input,
  so it can be locked down and cached far more aggressively than the others.

### Honest limitation

These are independently-deployable **presentation** services. There is no
service-to-service call, no API and no data store, because the provided
application has none — "login" and "payment" are client-side demo logic backed by
`localStorage` (see `README.txt` in the repository root). Splitting them buys
independent release, scaling, security policy and audit boundaries. It does not
make them domain microservices. A real decomposition would add backing services
for products, accounts and orders.

---

## Public routing

All three services sit behind **one** hostname, and the load balancer resolves
which service answers based on the request path:

| Path | Service |
|---|---|
| `/`, `/index.html`, `/products.html` | `nexvion-storefront` |
| `/payment.html` | `nexvion-checkout` |
| `/logo.png` | `nexvion-assets` |
| `/*.css`, `/*.js` | the service that owns the page referencing it |

Keeping a single origin is what allows the application's relative links —
`index.html ↔ products.html ↔ payment.html`, plus `logo.png` — to keep working
completely untouched. From the browser's point of view there is only ever one
host; the split exists only behind the ALB.

---

## Layout

```
docker/
├── README.md
├── .dockerignore                 (repo root) — build-context allowlist
├── common/
│   ├── entrypoint.sh             — config validation, then exec nginx as PID 1
│   ├── build/minify.mjs          — asset optimiser + integrity checks
│   └── nginx/
│       ├── nginx.conf            — main config (non-root, stdout logging)
│       ├── includes/
│       │   └── security-headers.conf
│       └── html/
│           ├── 404.html
│           └── 50x.html
├── storefront/{Dockerfile,nginx/default.conf}
├── checkout/{Dockerfile,nginx/default.conf}
└── assets/{Dockerfile,nginx/default.conf}
```

---

## Building

Build context is the **repository root**, not the service directory:

```bash
docker build -f docker/storefront/Dockerfile \
  --build-arg APP_VERSION=0.1.0 \
  --build-arg GIT_COMMIT="$(git rev-parse --short HEAD)" \
  --build-arg BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -t nexvion-storefront:0.1.0 .
```

Repeat for `docker/checkout/Dockerfile` and `docker/assets/Dockerfile`.

To ship assets unminified while debugging (for example to read the JS in
`kubectl exec`), add `--build-arg SKIP_MINIFY=true`.

### Build stages

| Service | Stages |
|---|---|
| storefront | `builder` (node:22-alpine) → `nginx-base` → `final` |
| checkout | `builder` (node:22-alpine) → `nginx-base` → `final` |
| assets | `nginx-base` → `final` |

`assets` has no builder stage — there is nothing to minify, and pulling in node
to copy one PNG would double the build time and enlarge the build attack surface
for no benefit.

The `nginx-base` stage exists to strip the stock config, the root-requiring
entrypoint and `/var/cache/nginx`. Stage 3 is a fresh `FROM nginx`, so anything
removed only in stage 2 comes back — the base image's welcome page is therefore
deleted again in the final stage, **before** the real content is copied in.

---

## Asset optimisation and its safety net

`common/build/minify.mjs` minifies each service's HTML, CSS and JS and reports
the saving into the build log:

| Service | Before | After | Saved |
|---|---|---|---|
| storefront | 61.6 KB | 47.2 KB | **-23.4%** |
| checkout | 40.0 KB | 30.0 KB | **-25.0%** |

Minifying JavaScript that drives a cart and checkout flow is only safe if we can
prove nothing structural was lost. A silently mangled selector would surface as
"the demo is broken" rather than as a build failure, so the build asserts
invariants and **fails** if they break:

1. **Element IDs are preserved.** Every `id="…"` in each source document must
   still be present in the minified output — nothing lost, nothing invented.
   `script.js` wires behaviour to ~20 of these IDs via `document.querySelector`,
   so a lost one is a silent functional regression.
2. **Every `localStorage` key is preserved.** Keys are discovered from the source
   file and asserted against its own output, rather than hardcoded — they are
   split across the two scripts, so a global checklist would either fail on a
   file that legitimately lacks a key or get weakened to check only one file.
   Losing a key silently logs shoppers out and empties baskets.
3. **No output is empty**, and the key extractor must actually find keys — an
   extractor that silently matches nothing fails the build rather than passing
   vacuously.

This caught two real defects during development: the base image's welcome page
leaking into `checkout` and `assets`, and an incorrect global key list.

Additionally, `terser` runs with `mangle: { toplevel: false }` so top-level
function names such as `money()` and `cartTotal()` survive minification and stay
callable — both by the application and by the test suite.

---

## Runtime hardening

| Concern | Implementation |
|---|---|
| Non-root | `USER 101:101` — the process is never root, so there is no privilege to drop and no window in which it is root |
| No `user` directive | nginx warns if `user` is set while running unprivileged; the stock config is replaced |
| Logs to stdout | JSON access log on `/dev/stdout`, errors on `/dev/stderr` — no files on disk, no extra mount needed |
| Temp paths | PID and all temp paths under `/tmp`, the only writable path under a read-only root filesystem |
| Fingerprinting | `server_tokens off`; nginx version never advertised |
| Dotfiles | `location ~ /\.` denies `.env`, `.git`, editor swap files |
| Health | `HEALTHCHECK` using busybox `wget` against `/healthz` |
| Shutdown | `STOPSIGNAL SIGQUIT` for graceful drain, plus `exec` so nginx is PID 1 and receives `SIGTERM` directly |
| Entry point | Replaces the stock one, which assumes root and rewrites config in place — it validates with `nginx -t` first, so a bad config fails fast instead of crash-looping silently |

The Kubernetes hardening (`readOnlyRootFilesystem`, `allowPrivilegeEscalation: false`, `drop: ["ALL"]`, `seccompProfile: RuntimeDefault`) is applied by the Helm chart, since it belongs with the pod spec rather than the image.

---

## Security headers

`common/nginx/includes/security-headers.conf` sets nine headers, including a
Content-Security-Policy. Two notes worth defending:

- **`script-src 'self'` with `script-src-attr 'unsafe-inline'`.** The app has
  exactly one inline event handler per page — `onerror="this.onerror=null;…"`
  at `script.js:555` and `payment.js:122`, used to swap in a placeholder when a
  product image fails. A plain `script-src 'self'` blocks inline handlers and
  would break that fallback. `script-src-attr` scopes the exception to event
  handler attributes only, so no inline `<script>` is permitted anywhere.
- **The CSP allowlist is load-bearing.** `images.unsplash.com` (all 12 product
  images plus hero and category cards), `placehold.co` (fallback),
  `fonts.googleapis.com` (the stylesheet link) and `fonts.gstatic.com` (the
  actual `.woff2` binaries) must all be present. Drop any one and the site
  breaks in a way that looks like a bug rather than a misconfiguration.

`upgrade-insecure-requests` is deliberately **omitted**: TLS terminates at the
ALB, which already 301s plain HTTP, so the header is redundant in production and
would break local testing by rewriting every subresource URL.

### The nginx `add_header` inheritance trap

`add_header` directives are **not additive down the config tree**. If a
`location` declares even one `add_header`, every `add_header` inherited from the
enclosing `server` block is discarded.

This bit us during development: the `.html` location set a `Cache-Control` header
without re-including `security-headers.conf`, so **every HTML page — including
the homepage — shipped with zero security headers** while CSS and JS were fine.
It looks correct in review and is invisible in the UI.

The rule is therefore: **every `location` that declares `add_header` re-includes
`security-headers.conf`.** This is asserted by the verification suite, which
checks all nine headers on all twelve routes rather than spot-checking one.

`expires` is not combined with `add_header Cache-Control` — `expires` emits its
own `Cache-Control`, which produced the header twice with conflicting values.

---

## Cache policy

Fixed asset filenames — `<link href="style.css">` — mean content-hashed names
(the only way to safely serve a one-year `immutable` cache) would require editing
the provided HTML. So:

| Asset | Policy |
|---|---|
| `.css`, `.js` | `public, max-age=0, must-revalidate` — conditional request, cheap 304 when unchanged |
| `.html` | `no-cache, must-revalidate` |
| `.png` and other binaries | `public, max-age=3600, must-revalidate` |
| error pages, `/version.json`, probes | `no-store` |

A redeployment is therefore picked up immediately rather than after a cache TTL,
at the cost of one conditional request per asset.

---

## Endpoints

Every service exposes the same three:

| Endpoint | Purpose |
|---|---|
| `/healthz` | liveness probe — `200 ok`, never logged |
| `/readyz` | readiness probe — `200 ready`, never logged |
| `/version.json` | build metadata: service, version, commit, build time |
| `/nginx_status` | `stub_status` for the Prometheus exporter, restricted to in-cluster and VPC CIDRs |

`/version.json` is generated at build time as a separate file rather than
injected into the HTML, which keeps the application bytes untouched and gives
deployment verification a single uniform endpoint to poll.

---

## Verification performed

Every image was built and exercised, not just written:

- **Routes** — all twelve across the three services, including 404, dotfile
  denial, and the correct response from each service's own and others' paths.
- **Content isolation** — `storefront` has no payment code, `checkout` has no
  catalogue code, `assets` has one binary.
- **Security headers** — all nine present on all twelve routes, with exactly one
  `Cache-Control` header each.
- **Runtime identity** — confirmed `uid=101`, not `0`, in all three.
- **Compression** — `style.css` 12,891 → 3,472 bytes, `script.js` → 4,334 bytes.
- **Logging** — JSON access log parsed from container stdout; `/healthz`
  confirmed absent from it.
- **Functional** — the **minified** JavaScript was loaded into a real DOM (jsdom)
  and exercised: 60 assertions covering currency formatting, HTML escaping,
  XSS payloads, the full cart lifecycle (add/increment/quantity/remove/subtotal/
  localStorage round-trip), featured-product rendering, registration, duplicate
  rejection, login, logout, bad-password rejection, checkout auth-gating, and
  order placement. All 60 pass. These live in `tests/` and run in CI.

---

## Known follow-ups

1. **`style.css` is duplicated** into both `storefront` and `checkout`, because
   every page includes it. At ~12 KB this is the pragmatic choice; the correct
   fix is a versioned shared package or an import map.
2. **`style-src 'unsafe-inline'`** is needed for the inline `style=""` attributes
   in the empty-cart renderer (`script.js:407-411`). Moving those into a CSS
   class would allow the token to be dropped and tighten the CSP.
3. **`logo.png` is 294 KB** and dominates the page weight of every document. It
   should be resized and re-encoded; it is left untouched here because it is
   provided application content.