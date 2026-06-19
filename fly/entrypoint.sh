#!/usr/bin/env bash
# Renders telemt's config.toml from env vars / Fly secrets, then starts telemt.
# Required:  TELEMT_SECRET  (32 hex chars; `openssl rand -hex 16`)
# Optional:  TLS_DOMAIN (default cloudflare.com), USE_MIDDLE_PROXY (default true,
#            required for ad-tag campaigns), AD_TAG (32 hex from @MTProxybot).
set -euo pipefail

: "${TELEMT_SECRET:?Set TELEMT_SECRET (32 hex) as a Fly secret: fly secrets set TELEMT_SECRET=...}"
export TLS_DOMAIN="${TLS_DOMAIN:-cloudflare.com}"
export USE_MIDDLE_PROXY="${USE_MIDDLE_PROXY:-true}"
export TELEMT_SECRET

mkdir -p /tmp/tlsfront

# Only substitute our own placeholders (leave any other $ untouched).
envsubst '${TELEMT_SECRET} ${TLS_DOMAIN} ${USE_MIDDLE_PROXY}' \
  < /config.toml.tmpl > /app/config.toml

# Per-user ad-tag (the promoted channel) is optional — append it only if set.
if [ -n "${AD_TAG:-}" ]; then
  printf '\n[access.user_ad_tags]\nmain = "%s"\n' "$AD_TAG" >> /app/config.toml
fi

exec /app/telemt /app/config.toml
