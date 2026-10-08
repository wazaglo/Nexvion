# syntax=docker/dockerfile:1.7
#
# ============================================================================
# NEXVION :: checkout service
#   Build:  docker build -f docker/checkout/Dockerfile \
#                   --build-arg GIT_COMMIT="$(git rev-parse --short HEAD)" .
# ============================================================================
# Build context is the REPOSITORY ROOT, same as the other services.
#
# This image deliberately contains ONLY the checkout surface:
#   payment.html, payment.js, payment.css, style.css
#
# No catalogue code, no products.html, no index.html. If the store-front is
# compromised this image is unaffected, and it can be deployed, patched or
# revoked without touching the browsing experience.
#
# style.css ships here too because payment.html includes it for the shared
# header/footer/button system. That shared-asset duplication is documented in
# docker/common/build/minify.mjs.

ARG NODE_IMAGE=node:22-alpine
ARG NGINX_IMAGE=nginx:1.29-alpine

# ============================================================================
# Stage 1 — builder
# ============================================================================
FROM ${NODE_IMAGE} AS builder

ARG SERVICE=checkout
ARG APP_VERSION=0.0.0-dev
ARG GIT_COMMIT=unknown
ARG BUILD_DATE=unknown
ARG SKIP_MINIFY=false

WORKDIR /build

# Versions pinned exactly for reproducible builds; see the note in
# docker/storefront/Dockerfile. A package.json must exist before `npm install`
# or this npm version fails with "Tracker idealTree already exists".
RUN printf '{"name":"nexvion-build","version":"1.0.0","private":true}\n' > package.json && \
    npm install --no-audit --no-fund --loglevel=error \
        html-minifier-terser@7.2.0 \
        terser@5.51.2 \
        clean-css@5.3.3

COPY docker/common/build/ ./build/
COPY docker/checkout/nginx/ ./nginx/

COPY payment.html ./
COPY style.css payment.css ./
COPY payment.js ./

RUN set -eu; \
    mkdir -p /build/src; \
    cp payment.html style.css payment.css payment.js /build/src/; \
    if [ "${SKIP_MINIFY}" = "true" ]; then \
        echo "[builder] SKIP_MINIFY=true — copying assets verbatim"; \
        mkdir -p /build/out; \
        cp /build/src/* /build/out/; \
    else \
        node /build/build/minify.mjs "${SERVICE}"; \
    fi; \
    printf '{"service":"%s","version":"%s","commit":"%s","built":"%s","serviceName":"checkout"}\n' \
        "${SERVICE}" "${APP_VERSION}" "${GIT_COMMIT}" "${BUILD_DATE}" \
        > /build/out/version.json; \
    ls -la /build/out

# ============================================================================
# Stage 2 — nginx-base
# ============================================================================
FROM ${NGINX_IMAGE} AS nginx-base

RUN set -eux; \
    rm -f /etc/nginx/conf.d/default.conf; \
    rm -f /etc/nginx/templates/default.conf.template; \
    rm -f /docker-entrypoint.sh /docker-entrypoint.d/10-listen-on-ipv6-by-default.sh; \
    rm -rf /var/cache/nginx; \
    rm -rf /usr/share/nginx/html; \
    mkdir -p /usr/share/nginx/html

# ============================================================================
# Stage 3 — final runtime
# ============================================================================
FROM ${NGINX_IMAGE} AS final

ARG SERVICE=checkout
ARG APP_VERSION=0.0.0-dev
ARG GIT_COMMIT=unknown
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="nexvion-checkout" \
      org.opencontainers.image.description="NEXVION checkout: delivery details and payment step" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${GIT_COMMIT}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.vendor="Team Davine Technologies" \
      org.opencontainers.image.source="https://github.com/davinetechnologiesprojects07/Nexvion" \
      org.opencontainers.image.licenses="UNLICENSED" \
      io.nexvion.service="checkout"

# ---------------------------------------------------------------------------
# Layout
# ---------------------------------------------------------------------------
COPY --from=nginx-base /etc/nginx/ /etc/nginx/
COPY docker/common/nginx/nginx.conf          /etc/nginx/nginx.conf
COPY docker/common/nginx/includes/           /etc/nginx/includes/
COPY docker/common/nginx/html/               /usr/share/nginx/html/
COPY docker/checkout/nginx/default.conf      /etc/nginx/conf.d/default.conf
COPY docker/common/entrypoint.sh             /usr/local/bin/entrypoint.sh

# The base image ships its own 896-byte "Welcome to nginx!" page at
# /usr/share/nginx/html/index.html. It must be removed BEFORE the builder output
# is copied in. (Stage 2 removes it too, but stage 3 is a fresh FROM the base
# image and only inherits /etc/nginx from stage 2.)
RUN rm -f /usr/share/nginx/html/index.html

COPY --from=builder --chown=101:101 /build/out/ /usr/share/nginx/html/

# ---------------------------------------------------------------------------
# Non-root execution
# ---------------------------------------------------------------------------
RUN set -eux; \
    chmod 0755 /usr/local/bin/entrypoint.sh; \
    chmod 1777 /tmp

USER 101:101

# ---------------------------------------------------------------------------
# Runtime contract consumed by Helm
# ---------------------------------------------------------------------------
EXPOSE 8080

ENV NEXVION_SERVICE=checkout

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/healthz || exit 1

STOPSIGNAL SIGQUIT

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]