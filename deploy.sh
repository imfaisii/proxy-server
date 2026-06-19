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
# 3. Host sysctls
# ---------------------------------------------------------------------------
log "Configuring host sysctls (conntrack accounting + unprivileged 443 bind)..."
$SUDO modprobe nf_conntrack 2>/dev/null || warn "modprobe nf_conntrack failed (may already be built-in)."
SYSCTL_FILE=/etc/sysctl.d/99-mtproxy.conf
# - conntrack acct/timestamp: per-connection byte counts.
# - tcp_timeout_established: defaults to 5 DAYS, so dead sessions linger in the
#   conntrack table and inflate the live-connection list. 2h is well above
#   MTProto keepalive intervals, so real sessions survive while dead ones expire.
# - ip_unprivileged_port_start=443: telemt runs as a non-root uid and uses host
#   networking, so it cannot otherwise bind the privileged port 443. This lets
#   unprivileged processes bind 443+ (lower the value if MTG_PORT < 443).
# - ip_forward=1: required so the wg-easy WireGuard VPN can route client traffic
#   to the internet (without it the tunnel connects but no traffic passes).
DESIRED_SYSCTL='net.netfilter.nf_conntrack_acct=1
net.netfilter.nf_conntrack_timestamp=1
net.netfilter.nf_conntrack_tcp_timeout_established=7200
net.ipv4.ip_unprivileged_port_start=443
net.ipv4.ip_forward=1'
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
  log "Creating .env from .env.example..."
  cp .env.example .env

  # Apply any settings passed via the environment, e.g.:
  #   ADMIN_PASSWORD='...' TUNNEL_TOKEN='...' ./deploy.sh
  for k in ADMIN_PASSWORD TUNNEL_TOKEN CONSOLE_DOMAIN MTG_DOMAIN MTG_PORT \
           SERVER_IP COLLECT_CONNECTIONS POSTGRES_USER POSTGRES_DB; do
    v="${!k:-}"
    if [ -n "$v" ]; then
      esc="$(printf '%s' "$v" | sed -e 's/[&|\\]/\\&/g')"
      sed -i "s|^${k}=.*|${k}=${esc}|" .env
      log "  set ${k} from environment"
    fi
  done

  # Always auto-generate strong secrets (never taken from the environment).
  PG_USER="${POSTGRES_USER:-mtproxy}"
  PG_DB="${POSTGRES_DB:-mtproxy}"
  GEN_SESSION="$(openssl rand -hex 24)"
  GEN_PGPASS="$(openssl rand -hex 24)"
  sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=${GEN_SESSION}|" .env
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${GEN_PGPASS}|" .env
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgres://${PG_USER}:${GEN_PGPASS}@127.0.0.1:5432/${PG_DB}|" .env

  # Pin the public IP so the console shows the real server address (not the seed).
  if ! grep -q '^SERVER_IP=.\+' .env; then
    DET_IP="$(curl -fsS https://api.ipify.org 2>/dev/null || true)"
    [ -z "$DET_IP" ] && DET_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
    if [ -n "$DET_IP" ]; then
      sed -i "s|^SERVER_IP=.*|SERVER_IP=${DET_IP}|" .env
      log "  detected SERVER_IP=${DET_IP}"
    fi
  fi
  log ".env created with generated secrets."
else
  log ".env already exists; migrating stale mtg-era values (custom edits preserved)..."
  # Old mtg metrics endpoint (:3129) -> telemt Prometheus (:9090). Only the known
  # old default is rewritten, so a customized value is left untouched.
  if grep -q '^MTG_METRICS_URL=http://127\.0\.0\.1:3129/metrics' .env; then
    sed -i 's|^MTG_METRICS_URL=http://127\.0\.0\.1:3129/metrics|MTG_METRICS_URL=http://127.0.0.1:9090/metrics|' .env
    log "  MTG_METRICS_URL -> telemt :9090"
  fi
  # Add the telemt management-API key if the upgrade left it absent.
  if ! grep -q '^TELEMT_API_URL=' .env; then
    printf 'TELEMT_API_URL=http://127.0.0.1:9091\n' >> .env
    log "  added TELEMT_API_URL=http://127.0.0.1:9091"
  fi
fi

# Load .env so we can use MTG_DOMAIN, CONSOLE_DOMAIN, TUNNEL_TOKEN below.
set -a
# shellcheck disable=SC1091
. ./.env
set +a
MTG_DOMAIN="${MTG_DOMAIN:-cloudflare.com}"

# ---------------------------------------------------------------------------
# 5 + 6. telemt config (rendered once; telemt then owns it — it persists users
#        and per-user ad-tags to disk in this dir, plus the tlsfront cache).
# ---------------------------------------------------------------------------
mkdir -p telemt/tlsfront
if [ ! -s telemt/config.toml ]; then
  log "Generating telemt secret + rendering telemt/config.toml (domain ${MTG_DOMAIN})..."
  SECRET="$(openssl rand -hex 16)"
  SECRET_ESC="$(printf '%s' "$SECRET" | sed 's/[&/\]/\\&/g')"
  DOMAIN_ESC="$(printf '%s' "$MTG_DOMAIN" | sed 's/[&/\]/\\&/g')"
  sed -e "s/__SECRET__/${SECRET_ESC}/" -e "s/__TLS_DOMAIN__/${DOMAIN_ESC}/" \
    -e "s/__PORT__/${MTG_PORT:-443}/" \
    telemt/config.toml.tmpl > telemt/config.toml
else
  log "telemt/config.toml already exists; reusing (telemt owns it)."
  # Recover the primary secret for the summary link below.
  SECRET="$(grep -E '^[[:space:]]*main[[:space:]]*=' telemt/config.toml | head -n1 | sed -E 's/.*"([0-9a-fA-F]+)".*/\1/')"
fi

# telemt runs as a nonroot uid (distroless 65532) and must write users/ad-tags +
# the tls_front cache into this bind-mounted dir, so it has to own it.
$SUDO chown -R 65532:65532 telemt 2>/dev/null || true

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
# Free port 443 from the old mtg engine: --remove-orphans drops the now-removed
# 'mtg' compose service, and the explicit rm covers a standalone server-setup.sh
# container. Both are no-ops on a fresh install.
log "Removing any old mtg proxy container (freeing port 443)..."
$SUDO docker rm -f mtg >/dev/null 2>&1 || true

log "Building and starting containers..."
$SUDO docker compose up -d --build --remove-orphans

# ---------------------------------------------------------------------------
# 9. Wait for postgres healthy + console http
# ---------------------------------------------------------------------------
log "Waiting for postgres to become healthy..."
for i in $(seq 1 60); do
  status="$($SUDO docker inspect -f '{{.State.Health.Status}}' "$($SUDO docker compose ps -q postgres)" 2>/dev/null || echo "")"
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

# telemt API readiness — campaigns persist through it, so flag failure loudly.
if curl -fsS -o /dev/null "http://127.0.0.1:9091/v1/users" 2>/dev/null; then
  log "telemt API is responding on :9091."
else
  warn "telemt API not responding on :9091 — campaigns won't persist. Check 'docker compose logs telemt' (config / dir ownership / working_dir)."
fi

# ---------------------------------------------------------------------------
# 10. Summary
# ---------------------------------------------------------------------------
PUBLIC_IP="${SERVER_IP:-}"
if [ -z "$PUBLIC_IP" ]; then PUBLIC_IP="$(curl -fsS https://api.ipify.org 2>/dev/null || echo "<unknown>")"; fi
# telemt FakeTLS link: ee + 16-byte hex secret + hex(domain). (Same format the
# console reads back from telemt's API; constructed here for the deploy summary.)
if [ -n "${SECRET}" ]; then
  DOMAIN_HEX="$(printf '%s' "${MTG_DOMAIN}" | od -An -tx1 | tr -d ' \n')"
  EE_SECRET="ee${SECRET}${DOMAIN_HEX}"
  TG_LINK="tg://proxy?server=${PUBLIC_IP}&port=${MTG_PORT:-443}&secret=${EE_SECRET}"
else
  EE_SECRET="(open the console to copy)"
  TG_LINK="(open the console — Settings — to copy the connection link)"
fi

echo
echo "============================================================"
echo " telemt proxy + console deployed"
echo "============================================================"
echo " Server IP   : ${PUBLIC_IP}"
echo " Proxy port  : ${MTG_PORT:-443}"
echo " FakeTLS SNI : ${MTG_DOMAIN}"
echo " Secret (ee) : ${EE_SECRET}"
echo " TG link     : ${TG_LINK}"
echo "------------------------------------------------------------"
echo " Campaigns   : open the console -> Campaigns to add promoted"
echo "               channels. Each needs an ad-tag from @MTProxybot"
echo "               (/newproxy). telemt manages users at :9091."
echo "------------------------------------------------------------"
echo " VPN (phone) : WireGuard via wg-easy is running on UDP 51820."
echo "               1) Allow inbound UDP 51820 in the Hostinger panel firewall."
echo "               2) Admin UI is loopback-only; open it over an SSH forward:"
echo "                    ssh -L 51821:127.0.0.1:51821 root@${PUBLIC_IP}"
echo "                  then browse http://127.0.0.1:51821 (first run = set admin),"
echo "                  set Host=${PUBLIC_IP} Port=51820, AllowedIPs=0.0.0.0/0,"
echo "                  add a client, scan the QR in the WireGuard phone app."
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
