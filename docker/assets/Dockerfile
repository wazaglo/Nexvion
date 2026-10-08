# syntax=docker/dockerfile:1.7
#
# ============================================================================
# NEXVION :: asset service
#   Build:  docker build -f docker/assets/Dockerfile \
#                   --build-arg GIT_COMMIT="$(git rev-parse --short HEAD)" .
# ============================================================================
# Owns /logo.png — the brand binary referenced by every NEXVION page.
#
# TWO STAGES, NOT THREE. There is nothing to minify: the service serves binaries
# only, and the optimizer would have nothing to do. Pulling in node just to copy
# a PNG would roughly double the build time and the attack surface of the build
# for zero benefit. The optimizer is invoked by the storefront and checkout
# builds, where there is actual work to do.

ARG NGINX_IMAGE=nginx:1.29-alpine

# ============================================================================
# Stage 1 — nginx-base
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
# Stage 2 — final runtime
# ============================================================================
FROM ${NGINX_IMAGE} AS final

ARG APP_VERSION=0.0.0-dev
ARG GIT_COMMIT=unknown
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="nexvion-assets" \
      org.opencontainers.image.description="NEXVION asset origin: brand binaries (logo.png)" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${GIT_COMMIT}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.vendor="Team Davine Technologies" \
      org.opencontainers.image.source="https://github.com/davinetechnologiesprojects07/Nexvion" \
      org.opencontainers.image.licenses="UNLICENSED" \
      io.nexvion.service="assets"

COPY --from=nginx-base /etc/nginx/ /etc/nginx/
COPY docker/common/nginx/nginx.conf         /etc/nginx/nginx.conf
COPY docker/common/nginx/includes/          /etc/nginx/includes/
COPY docker/common/nginx/html/              /usr/share/nginx/html/
COPY docker/assets/nginx/default.conf       /etc/nginx/conf.d/default.conf
COPY docker/common/entrypoint.sh            /usr/local/bin/entrypoint.sh

# ---------------------------------------------------------------------------
# Content — a single binary, chowned to the runtime uid
# ---------------------------------------------------------------------------
# The base image ships its own 896-byte "Welcome to nginx!" page at
# /usr/share/nginx/html/index.html. It must be removed BEFORE content is copied
# in. (Stage 2 removes it too, but stage 3 is a fresh FROM the base image and
# only inherits /etc/nginx from stage 2.)
RUN rm -f /usr/share/nginx/html/index.html

COPY --chown=101:101 logo.png /usr/share/nginx/html/logo.png

# This service has no builder stage, so /version.json is written here instead of
# being produced by the optimiser. Keeping the same endpoint across all three
# services means a single deployment-verification script works unchanged
# regardless of which service it is pointed at.
RUN printf '{"service":"assets","version":"%s","commit":"%s","built":"%s","serviceName":"assets"}\n' \
        "${APP_VERSION}" "${GIT_COMMIT}" "${BUILD_DATE}" \
        > /usr/share/nginx/html/version.json

RUN set -eux; \
    chmod 0755 /usr/local/bin/entrypoint.sh; \
    chmod 1777 /tmp

USER 101:101

# ---------------------------------------------------------------------------
# Runtime contract consumed by Helm
# ---------------------------------------------------------------------------
EXPOSE 8080

ENV NEXVION_SERVICE=assets

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/healthz || exit 1

STOPSIGNAL SIGQUIT

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]