#!/usr/bin/env bash
# ============================================================================
#  MTProxy (mtg, FakeTLS MTProto) — one-command setup WITH a metrics endpoint
#  Run on your VPS:   curl -fsSL <url-to-this-file> | bash
#  or:                bash server-setup.sh
# ============================================================================
set -euo pipefail

DOMAIN="${MTG_DOMAIN:-cloudflare.com}"   # FakeTLS domain to mimic
PROXY_PORT="${MTG_PORT:-443}"            # public proxy port
METRICS_PORT="${MTG_METRICS_PORT:-3129}" # Prometheus metrics (bind to localhost)

# 1. Docker
command -v docker >/dev/null 2>&1 || curl -fsSL https://get.docker.com | sh
docker pull nineseconds/mtg:2

# 2. Secret (reuse existing if present, else generate)
if [ -f /etc/mtg/secret ]; then
  SECRET="$(cat /etc/mtg/secret)"
else
  SECRET="$(docker run --rm nineseconds/mtg:2 generate-secret "$DOMAIN")"
  mkdir -p /etc/mtg && echo "$SECRET" > /etc/mtg/secret
fi

# 3. Config with Prometheus metrics ENABLED (this is what the dashboard reads)
cat > /etc/mtg/config.toml <<EOF
secret = "${SECRET}"
bind-to = "0.0.0.0:${PROXY_PORT}"

[stats.prometheus]
enabled  = true
bind-to  = "0.0.0.0:${METRICS_PORT}"
http-path = "/metrics"
EOF

# 4. (Re)start the proxy
docker rm -f mtg 2>/dev/null || true
docker run -d --name mtg --restart=unless-stopped \
  -p ${PROXY_PORT}:${PROXY_PORT} \
  -p 127.0.0.1:${METRICS_PORT}:${METRICS_PORT} \
  -v /etc/mtg/config.toml:/config.toml \
  nineseconds/mtg:2 run /config.toml

# 5. Print connection details
IP="$(curl -s https://api.ipify.org || echo YOUR_SERVER_IP)"
cat <<EOF

===== TELEGRAM MTPROTO PROXY =====
Server:  ${IP}
Port:    ${PROXY_PORT}
Secret:  ${SECRET}
Link:    tg://proxy?server=${IP}&port=${PROXY_PORT}&secret=${SECRET}

Metrics: http://127.0.0.1:${METRICS_PORT}/metrics   (localhost only)
==================================

To read metrics from your laptop without exposing the port publicly:
  ssh -N -L ${METRICS_PORT}:127.0.0.1:${METRICS_PORT} root@${IP}
then open http://localhost:${METRICS_PORT}/metrics

EOF
