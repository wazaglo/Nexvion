# syntax=docker/dockerfile:1.7
#
# ============================================================================
# NEXVION :: store-front service
#   Build:  docker build -f docker/storefront/Dockerfile \
#                   --build-arg GIT_COMMIT="$(git rev-parse --short HEAD)" .
# ============================================================================
# Build context is the REPOSITORY ROOT, not docker/storefront/. Each service
# image is assembled from its own COPY instructions, and .dockerignore restricts
# what the daemon is even allowed to send — so a service image can only ever
# contain files it explicitly asks for.
#
# Three stages:
#   1. builder   node:22-alpine   — minify HTML/CSS/JS, emit build metadata
#   2. nginx-base nginx:1.29-alpine — strip the stock config and entrypoint
#   3. final     nginx:1.29-alpine — non-root runtime, immutable filesystem
#
# Why stage 2 exists: the stock nginx image carries /etc/nginx/conf.d/default.conf,
# an entrypoint that needs root, and a root-owned /var/cache/nginx. Stripping
# that in an intermediate stage means the final stage starts from a clean,
# predictable filesystem and the deletions never bloat the published image.

ARG NODE_IMAGE=node:22-alpine
ARG NGINX_IMAGE=nginx:1.29-alpine

# ============================================================================
# Stage 1 — builder
# ============================================================================
FROM ${NODE_IMAGE} AS builder

ARG SERVICE=storefront
ARG APP_VERSION=0.0.0-dev
ARG GIT_COMMIT=unknown
ARG BUILD_DATE=unknown
ARG SKIP_MINIFY=false

WORKDIR /build

# Minifiers are installed in their own layer so that editing an application file
# does not invalidate the npm cache layer and force a network re-install.
#
# All three are pure-JavaScript packages. This matters: node:22-alpine is musl
# based, so a minifier shipping native bindings (lightningcss, for example)
# would need a matching musl prebuild and becomes a portability landmine.
#
# Versions are pinned exactly. A floating tag such as `terser@latest` makes the
# build non-reproducible and turns an upstream release into an unannounced
# change to a production image.
#
# A package.json is written first because `npm install` without one triggers
# npm's implicit-manifest path, which fails on this npm version with
# "Tracker idealTree already exists".
RUN printf '{"name":"nexvion-build","version":"1.0.0","private":true}\n' > package.json && \
    npm install --no-audit --no-fund --loglevel=error \
        html-minifier-terser@7.2.0 \
        terser@5.51.2 \
        clean-css@5.3.3

COPY docker/common/build/ ./build/
COPY docker/storefront/nginx/ ./nginx/

# Only this service's files are staged into the builder. Payment code is never
# present in the store-front image, and vice versa — the two are independently
# buildable, independently scannable and independently revocable.
COPY index.html products.html ./
COPY style.css products.css ./
COPY script.js ./

RUN set -eu; \
    mkdir -p /build/src; \
    cp index.html products.html style.css products.css script.js /build/src/; \
    if [ "${SKIP_MINIFY}" = "true" ]; then \
        echo "[builder] SKIP_MINIFY=true — copying assets verbatim"; \
        mkdir -p /build/out; \
        cp /build/src/* /build/out/; \
    else \
        node /build/build/minify.mjs "${SERVICE}"; \
    fi; \
    # Build metadata is emitted as a separate generated file rather than being
    # injected into the HTML. Injecting it would mean rewriting the provided
    # application source, and /version.json keeps the app bytes untouched.
    printf '{"service":"%s","version":"%s","commit":"%s","built":"%s","serviceName":"storefront"}\n' \
        "${SERVICE}" "${APP_VERSION}" "${GIT_COMMIT}" "${BUILD_DATE}" \
        > /build/out/version.json; \
    ls -la /build/out

# ============================================================================
# Stage 2 — nginx-base
# ============================================================================
FROM ${NGINX_IMAGE} AS nginx-base

# Remove everything we replace. Leaving the stock default.conf in place would
# add a second server{} block listening on port 80 that we never intended, and
# it is the usual reason an nginx container starts "successfully" but serves the
# wrong thing.
RUN set -eux; \
    rm -f /etc/nginx/conf.d/default.conf; \
    rm -f /etc/nginx/templates/default.conf.template; \
    rm -f /docker-entrypoint.sh /docker-entrypoint.d/10-listen-on-ipv6-by-default.sh; \
    rm -rf /var/cache/nginx /usr/share/nginx/html/*; \
    rm -rf /usr/share/nginx/html; \
    mkdir -p /usr/share/nginx/html

# ============================================================================
# Stage 3 — final runtime
# ============================================================================
FROM ${NGINX_IMAGE} AS final

ARG SERVICE=storefront
ARG APP_VERSION=0.0.0-dev
ARG GIT_COMMIT=unknown
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="nexvion-storefront" \
      org.opencontainers.image.description="NEXVION store-front: home page and product catalogue" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${GIT_COMMIT}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.vendor="Team Davine Technologies" \
      org.opencontainers.image.source="https://github.com/davinetechnologiesprojects07/Nexvion" \
      org.opencontainers.image.licenses="UNLICENSED" \
      io.nexvion.service="storefront"

# ---------------------------------------------------------------------------
# Layout
# ---------------------------------------------------------------------------
COPY --from=nginx-base /etc/nginx/ /etc/nginx/
COPY docker/common/nginx/nginx.conf            /etc/nginx/nginx.conf
COPY docker/common/nginx/includes/             /etc/nginx/includes/
COPY docker/common/nginx/html/                 /usr/share/nginx/html/
COPY docker/storefront/nginx/default.conf      /etc/nginx/conf.d/default.conf
COPY docker/common/entrypoint.sh               /usr/local/bin/entrypoint.sh

# ---------------------------------------------------------------------------
# Application content — comes from the optimised builder output
# ---------------------------------------------------------------------------
# The base image ships its own 896-byte "Welcome to nginx!" page at
# /usr/share/nginx/html/index.html. It must be removed BEFORE the builder output
# is copied in, or this line deletes our own index.html instead and "/" starts
# returning 403. (Stage 2 removes it too, but stage 3 is a fresh FROM the base
# image and only inherits /etc/nginx from stage 2.)
RUN rm -f /usr/share/nginx/html/index.html

COPY --from=builder --chown=101:101 /build/out/ /usr/share/nginx/html/

# ---------------------------------------------------------------------------
# Non-root execution
# ---------------------------------------------------------------------------
# uid/gid 101 is the `nginx` user already present in the base image. Setting USER
# here (rather than a `user` directive in nginx.conf) means the container simply
# never has root, so there is no privilege to drop and no window in which the
# process is root. Combined with readOnlyRootFilesystem, allowPrivilegeEscalation
# false and drop:ALL in the Helm chart, the container has no writable path and
# no retained privilege between them.
RUN set -eux; \
    chmod 0755 /usr/local/bin/entrypoint.sh; \
    # Only /tmp must be writable, and it is supplied as an emptyDir by the chart.
    chmod 1777 /tmp

USER 101:101

# ---------------------------------------------------------------------------
# Runtime contract consumed by Helm (deployment.yaml / service.yaml)
# ---------------------------------------------------------------------------
EXPOSE 8080

ENV NEXVION_SERVICE=storefront \
    NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx/generated

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/healthz || exit 1

STOPSIGNAL SIGQUIT

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]