# Live HTTP verification through the ALB

ALB: `k8s-nexvion-nexvion-629ab9ec7a-599425356.us-east-1.elb.amazonaws.com`

## Route matrix
| Route | Code | Content-Type | Bytes |
|-------|------|--------------|-------|
| `/` | 200 | text/html; charset=utf-8 | 8964 |
| `/index.html` | 200 | text/html; charset=utf-8 | 8964 |
| `/products.html` | 200 | text/html; charset=utf-8 | 7133 |
| `/payment.html` | 200 | text/html; charset=utf-8 | 5997 |
| `/logo.png` | 200 | image/png | 294197 |
| `/script.js` | 200 | application/javascript; charset=utf-8 | 14590 |
| `/style.css` | 200 | text/css | 12891 |
| `/version.json` | 200 | application/json | 120 |
| `/healthz` | 200 | text/plain | 3 |
| `/readyz` | 200 | text/plain | 6 |
| `/missing` | 404 | text/html; charset=utf-8 | 2714 |
| `/.env` | 403 | text/html; charset=utf-8 | 146 |

## Response headers on /
```
HTTP/1.1 200 OK
Date: Thu, 08 Oct 2026 14:10:59 GMT
Content-Type: text/html; charset=utf-8
Content-Length: 8964
Connection: keep-alive
Server: nginx
Last-Modified: Thu, 08 Oct 2026 09:02:03 GMT
Vary: Accept-Encoding
ETag: "6ac75c0b-2304"
Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: https://images.unsplash.com https://placehold.co; font-src 'self' data: https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self'; script-src-attr 'unsafe-inline'; connect-src 'self'; manifest-src 'self'
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
ServerTokens: hide
Cache-Control: no-cache, must-revalidate
Accept-Ranges: bytes

```

## Backend routing proof via /version.json
```
$ curl k8s-nexvion-nexvion-629ab9ec7a-599425356.us-east-1.elb.amazonaws.com/version.json
{"service":"storefront","version":"0.1.1","commit":"be22c04","built":"2026-10-08T09:01:50Z","serviceName":"storefront"}

```

## Asset minification (served size vs repo size)
```
style.css   served 12891 bytes
style.css   repo   16777 bytes
script.js   served 14590 bytes
script.js   repo   20138 bytes
```
