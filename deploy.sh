#!/usr/bin/env bash
#
# deploy.sh — one-command, idempotent deployment for the mtg proxy + console
# on a fresh Ubuntu server. Safe to re-run; every step checks before acting.
#
set -euo pipefail

# Resolve and cd into the repo directory regardless of where it is invoked from.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }
err()  { printf '\033[1;31m[err]\033[0m %s\n' "$*" >&2; }

# Use sudo only when not already root.
if [ "$(id -u)" -eq 0 ]; then SUDO=""; else SUDO="sudo"; fi

need_cmd() { command -v "$1" >/dev/null 2>&1; }

# ---------------------------------------------------------------------------
# 1. Docker + compose plugin
# ---------------------------------------------------------------------------
if ! need_cmd docker; then
  log "Installing Docker..."
  curl -fsSL https://get.docker.com | $SUDO sh
else
  log "Docker already installed; skipping."
fi

if ! docker compose version >/dev/null 2>&1; then
  log "Installing docker compose plugin..."
  $SUDO apt-get update -y
  $SUDO apt-get install -y --no-install-recommends docker-compose-plugin
else
  log "docker compose plugin already present; skipping."
fi

# ---------------------------------------------------------------------------
# 2. Host packages
# ---------------------------------------------------------------------------
MISSING_PKGS=()
for pair in conntrack:conntrack ip:iproute2 gzip:gzip curl:curl jq:jq openssl:openssl; do
  cmd="${pair%%:*}"; pkg="${pair##*:}"
  if ! need_cmd "$cmd"; then MISSING_PKGS+=("$pkg"); fi
done
if [ "${#MISSING_PKGS[@]}" -gt 0 ]; then
  log "Installing host packages: ${MISSING_PKGS[*]}"
  $SUDO apt-get update -y
  $SUDO apt-get install -y --no-install-recommends "${MISSING_PKGS[@]}"
else
  log "All required host packages present; skipping."
fi

# ---------------------------------------------------------------------------
# 3. conntrack accounting sysctls (needed for per-connection byte counts)
# ---------------------------------------------------------------------------
log "Configuring conntrack accounting sysctls..."
$SUDO modprobe nf_conntrack 2>/dev/null || warn "modprobe nf_conntrack failed (may already be built-in)."
SYSCTL_FILE=/etc/sysctl.d/99-mtproxy.conf
DESIRED_SYSCTL='net.netfilter.nf_conntrack_acct=1
net.netfilter.nf_conntrack_timestamp=1'
if [ ! -f "$SYSCTL_FILE" ] || [ "$(cat "$SYSCTL_FILE" 2>/dev/null)" != "$DESIRED_SYSCTL" ]; then
  printf '%s\n' "$DESIRED_SYSCTL" | $SUDO tee "$SYSCTL_FILE" >/dev/null
  $SUDO sysctl --system >/dev/null
else
  log "conntrack sysctls already configured; skipping."
fi

# ---------------------------------------------------------------------------
# 4. .env (auto-generate secrets on first creation)
# ---------------------------------------------------------------------------
if [ ! -f .env ]; then
  log "Creating .env from .env.example with generated secrets..."
  cp .env.example .env
  GEN_SESSION="$(openssl rand -hex 24)"
  GEN_PGPASS="$(openssl rand -hex 24)"
  # Substitute the placeholder secrets. PG password must also flow into DATABASE_URL.
  sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=${GEN_SESSION}|" .env
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${GEN_PGPASS}|" .env
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgres://mtproxy:${GEN_PGPASS}@127.0.0.1:5432/mtproxy|" .env
else
  log ".env already exists; leaving it untouched."
fi

# Load .env so we can use MTG_DOMAIN, CONSOLE_DOMAIN, TUNNEL_TOKEN below.
set -a
# shellcheck disable=SC1091
. ./.env
set +a
MTG_DOMAIN="${MTG_DOMAIN:-cloudflare.com}"

# ---------------------------------------------------------------------------
# 5. FakeTLS secret
# ---------------------------------------------------------------------------
$SUDO mkdir -p /etc/mtg
if [ ! -s /etc/mtg/secret ]; then
  log "Generating FakeTLS secret for domain ${MTG_DOMAIN}..."
  docker run --rm nineseconds/mtg:2 generate-secret "${MTG_DOMAIN}" | $SUDO tee /etc/mtg/secret >/dev/null
else
  log "FakeTLS secret already exists; reusing."
fi
SECRET="$($SUDO cat /etc/mtg/secret)"

# ---------------------------------------------------------------------------
# 6. Render mtg/config.toml from template
# ---------------------------------------------------------------------------
log "Rendering mtg/config.toml..."
# Use a non-/ delimiter is unnecessary since the secret is hex/base64-safe,
# but escape via awk-free sed by passing the secret through a temp value.
SECRET_ESC="$(printf '%s' "$SECRET" | sed 's/[&/\]/\\&/g')"
sed "s/__SECRET__/${SECRET_ESC}/" mtg/config.toml.tmpl > mtg/config.toml

# ---------------------------------------------------------------------------
# 7. GeoIP database (optional)
# ---------------------------------------------------------------------------
mkdir -p data/geoip
if [ ! -s data/geoip/city.mmdb ]; then
  log "Downloading db-ip free city database..."
  CUR_YM="$(date +%Y-%m)"
  PREV_YM="$(date -d 'last month' +%Y-%m 2>/dev/null || date -v-1m +%Y-%m 2>/dev/null || echo "")"
  GEO_OK=0
  for YM in "$CUR_YM" "$PREV_YM"; do
    [ -z "$YM" ] && continue
    URL="https://download.db-ip.com/free/dbip-city-lite-${YM}.mmdb.gz"
    log "Trying ${URL}"
    if curl -fsSL "$URL" -o /tmp/dbip-city.mmdb.gz; then
      if gunzip -c /tmp/dbip-city.mmdb.gz > data/geoip/city.mmdb; then
        rm -f /tmp/dbip-city.mmdb.gz
        GEO_OK=1
        log "GeoIP database installed (${YM})."
        break
      fi
    fi
  done
  if [ "$GEO_OK" -ne 1 ]; then
    rm -f data/geoip/city.mmdb /tmp/dbip-city.mmdb.gz 2>/dev/null || true
    warn "Could not download GeoIP database. Geolocation will be disabled (optional)."
  fi
else
  log "GeoIP database already present; skipping download."
fi

# ---------------------------------------------------------------------------
# 8. Bring up the stack
# ---------------------------------------------------------------------------
log "Building and starting containers..."
docker compose up -d --build

# ---------------------------------------------------------------------------
# 9. Wait for postgres healthy + console http
# ---------------------------------------------------------------------------
log "Waiting for postgres to become healthy..."
for i in $(seq 1 60); do
  status="$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q postgres)" 2>/dev/null || echo "")"
  if [ "$status" = "healthy" ]; then break; fi
  sleep 2
  if [ "$i" -eq 60 ]; then warn "postgres did not report healthy in time; continuing."; fi
done

log "Waiting for console HTTP on http://127.0.0.1:3000 ..."
for i in $(seq 1 60); do
  if curl -fsS -o /dev/null "http://127.0.0.1:3000/api/session" 2>/dev/null; then
    log "Console is responding."
    break
  fi
  sleep 2
  if [ "$i" -eq 60 ]; then warn "Console did not respond in time; check 'docker compose logs console'."; fi
done

# ---------------------------------------------------------------------------
# 10. Summary
# ---------------------------------------------------------------------------
PUBLIC_IP="${SERVER_IP:-}"
if [ -z "$PUBLIC_IP" ]; then PUBLIC_IP="$(curl -fsS https://api.ipify.org 2>/dev/null || echo "<unknown>")"; fi
TG_LINK="tg://proxy?server=${PUBLIC_IP}&port=${MTG_PORT:-443}&secret=${SECRET}"

echo
echo "============================================================"
echo " mtg proxy + console deployed"
echo "============================================================"
echo " Server IP   : ${PUBLIC_IP}"
echo " Proxy port  : ${MTG_PORT:-443}"
echo " FakeTLS SNI : ${MTG_DOMAIN}"
echo " Secret      : ${SECRET}"
echo " TG link     : ${TG_LINK}"
echo "------------------------------------------------------------"
if [ -n "${TUNNEL_TOKEN:-}" ]; then
  echo " Console URL : https://${CONSOLE_DOMAIN:-console.nodenocode.com}"
else
  echo " Console URL : http://127.0.0.1:3000 (local only)"
  echo "               Set TUNNEL_TOKEN in .env and re-run to serve"
  echo "               the console over SSL via Cloudflare Tunnel at"
  echo "               https://${CONSOLE_DOMAIN:-console.nodenocode.com}"
fi
echo "============================================================"
