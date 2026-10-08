#!/bin/sh
# ============================================================================
# NEXVION — shared container entrypoint
# ============================================================================
# Deliberately replaces the nginx image's stock /docker-entrypoint.sh.
#
# The stock entrypoint assumes it starts as root: it rewrites conf.d/default.conf
# to enable IPv6 listening, substitutes /etc/nginx/templates, and tune worker
# processes by editing nginx.conf in place. None of that works when the process
# starts as uid 101 against a read-only root filesystem, and its failure modes
# are quiet.
#
# This entrypoint does the one thing that actually matters — prove the
# configuration parses before committing to it — then hand off. Because exec is
# used, nginx becomes PID 1 and receives SIGTERM directly, so Kubernetes
# preStop hooks and pod termination behave correctly.
# ============================================================================

set -eu

# Validate first. A malformed config (a bad regex, a missing include, an
# unresolved variable) otherwise produces a silent crash-loop that looks like an
# application problem rather than a configuration problem.
if ! nginx -t -q 2>/dev/null; then
    echo "[entrypoint] FATAL: nginx configuration is invalid" >&2
    nginx -t 2>&1 >&2 || true
    exit 1
fi

echo "[entrypoint] configuration valid, starting nginx as uid=$(id -u)"

# -g 'daemon off;' keeps nginx in the foreground so it owns PID 1.
exec nginx -g 'daemon off;'