# MTProxy Console

Self-hosted monitoring console for an **mtg FakeTLS MTProto (Telegram) proxy**,
plus a one-command installer that stands up the whole stack on a fresh Ubuntu
server. Built with Next.js 16 (App Router) + React 19, Postgres, and Cloudflare
Tunnel.

The console shows **real** proxy data when the stack is running, and falls back
to seeded demo data when a source is unavailable (so it always renders). Five
views — Overview, Connections, Geography, Campaigns, Settings — behind a
password gate, with a live connection drawer and toasts.

---

## What's real vs. demo

| Data | Source | Notes |
| --- | --- | --- |
| Active connections, traffic totals/rates, replay attacks, uptime | mtg **Prometheus** metrics (`/metrics`) | Real. Rates derived from byte deltas by a background poller. |
| Connections table + Geography | Host **`conntrack`** + local **GeoIP** (db-ip) | Real. **Live-only — client IPs are never written to the DB.** |
| Metric history (the chart) | **Postgres** (`metrics_history`) | Aggregate only. |
| Campaigns | Postgres (`campaigns`) | Admin-managed records. mtg v2 has no ad feature, so these don't auto-inject into the proxy. |

When mtg/Postgres/conntrack aren't reachable, the dashboard header shows a
**"Demo data"** pill and serves seeded values.

> **Privacy.** This proxy circumvents censorship. Client IPs are read live from
> conntrack and shown in the UI but **never persisted**. Set
> `COLLECT_CONNECTIONS=false` to disable IP collection entirely (the Connections
> and Geography pages then fall back to demo).

---

## Architecture

```
                         ┌──────────────── Ubuntu server ────────────────┐
 Telegram client ──443──▶│  mtg (docker)  ──metrics──▶ 127.0.0.1:3129     │
                         │                                                │
 Admin browser           │  console (Next.js, docker, host network)       │
   │ https               │    • polls mtg metrics  • reads conntrack+GeoIP │
   ▼                     │    • Postgres (history, campaigns)              │
 Cloudflare ──tunnel────▶│  cloudflared (docker) ──▶ localhost:3000        │
 (nodenocode.com SSL)    │  postgres (docker)                             │
                         └────────────────────────────────────────────────┘
```

The console runs on the **host network** with `CAP_NET_ADMIN` so it can read the
host conntrack table. Cloudflare Tunnel serves it over SSL **without opening any
inbound port** — avoiding a conflict with mtg on 443.

---

## Deploy (fresh Ubuntu server)

```bash
git clone <this-repo> mtproxy && cd mtproxy
./deploy.sh
```

`deploy.sh` is idempotent (safe to re-run) and does everything:

1. installs Docker + the compose plugin, and host packages (`conntrack`,
   `iproute2`, `gzip`, `curl`, `jq`, `openssl`) — each only if missing;
2. enables conntrack accounting/timestamp sysctls (for per-connection bytes &
   duration);
3. creates `.env` from `.env.example`, auto-generating `SESSION_SECRET` and the
   Postgres password;
4. generates (or reuses) the FakeTLS secret in `/etc/mtg/secret` and renders
   `mtg/config.toml`;
5. downloads the free db-ip city GeoIP database (best-effort);
6. `docker compose up -d --build` and waits for health;
7. prints the server IP, proxy port, secret, `tg://` link, and console URL.

Sign in with the password in `.env` (`ADMIN_PASSWORD`, default `admin` — **change
it**).

### Serving the console over SSL (Cloudflare Tunnel)

1. In the Cloudflare dashboard → **Zero Trust → Networks → Tunnels**, create a
   tunnel, add a public hostname (`console.nodenocode.com` → `http://localhost:3000`),
   and copy the tunnel **token**.
2. Put it in `.env`: `TUNNEL_TOKEN=...` (and `CONSOLE_DOMAIN=console.nodenocode.com`).
3. Re-run `./deploy.sh` (or `docker compose up -d cloudflared`).

Without a token the console is reachable only at `http://127.0.0.1:3000` on the
server (use an SSH tunnel to view it).

---

## Configuration (`.env`)

| Key | Purpose |
| --- | --- |
| `ADMIN_PASSWORD` | Console login password. |
| `SESSION_SECRET` | Signs session cookies (auto-generated). |
| `POSTGRES_USER/PASSWORD/DB`, `DATABASE_URL` | Postgres (password auto-generated and synced into the URL). |
| `MTG_METRICS_URL` | mtg Prometheus endpoint (`http://127.0.0.1:3129/metrics`). |
| `MTG_DOMAIN` | FakeTLS SNI to mimic (default `cloudflare.com` — best camouflage). |
| `MTG_SECRET_PATH`, `MTG_PORT` | Secret file path + public proxy port. |
| `COLLECT_CONNECTIONS` | `true`/`false` — read host conntrack for the live connections list. |
| `GEOIP_PATH` | Path to the db-ip city `.mmdb`. |
| `POLL_INTERVAL_MS` | Metrics poll cadence (default 5000). |
| `CONSOLE_DOMAIN`, `TUNNEL_TOKEN` | Cloudflare Tunnel hostname + token. |
| `SERVER_IP` | Optional; pins the public IP used in the `tg://` link and excludes the proxy's own outbound flows from the connections list. |

---

## Local development

```bash
bun install
bun dev          # http://localhost:3000
```

With no proxy/Postgres reachable, the console runs in **demo mode**. Sign in with
`admin`.

> `next start` is not used locally — the project builds with `output: "standalone"`
> for the small Docker runtime (`node server.js`). Use `bun dev` for development.

Scripts: `bun run build`, `bun run lint`.

---

## Project layout

```
app/
  api/{auth/login,auth/logout,session,state,campaigns}/route.ts   # backend
  layout.tsx · globals.css · page.tsx
components/
  Console.tsx · Chart.tsx · Icon.tsx · FX.tsx · ui.ts
  screens/{Overview,Connections,Geography,Campaigns,Settings}.tsx
lib/
  data.ts          # seed data + formatters (also the demo fallback)
  types.ts         # API contract (DashboardState)
  env.ts           # typed config from env
  metrics.ts       # mtg Prometheus parser
  conntrack.ts     # host connection enumeration (live-only)
  geoip.ts         # local GeoIP lookups
  db.ts            # Postgres (history + campaigns)
  aggregate.ts     # builds the live DashboardState
  auth.ts          # signed-cookie session
  store.ts         # latest in-memory snapshot
  useDashboard.ts  # client polling hook
instrumentation.ts · instrumentation.node.ts   # background metrics poller
Dockerfile · docker-compose.yml · deploy.sh · mtg/config.toml.tmpl
server-setup.sh    # standalone proxy-only installer (no console)
```

---

## Verify on the server

```bash
docker compose ps                        # all services up
curl -s http://127.0.0.1:3129/metrics    # mtg metrics reachable
curl -s http://127.0.0.1:3000/api/session
docker compose logs -f console           # poller + request logs
```

### Tuning the live data

mtg's exact Prometheus series names can vary by version. After first deploy,
confirm them: `curl http://127.0.0.1:3129/metrics`. The mapping in
[lib/metrics.ts](lib/metrics.ts) matches on name substrings (`client_connections`,
`client_traffic`, `replay`) and prefers client-side traffic to avoid
double-counting; adjust there if your build differs.

If the Connections/Geography pages stay on demo data while the proxy has real
traffic, conntrack isn't readable from the container — check that the
`nf_conntrack` module is loaded and the sysctls from `deploy.sh` are applied, or
set `COLLECT_CONNECTIONS=false`.
