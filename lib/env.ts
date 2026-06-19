// Runtime configuration read from process.env with sensible defaults.
// This is the single source of truth for every other server-side module.

function bool(v: string | undefined, dflt: boolean): boolean {
  if (v === undefined) return dflt;
  const s = v.trim().toLowerCase();
  if (s === "false" || s === "0" || s === "no" || s === "off") return false;
  return true;
}

function num(v: string | undefined, dflt: number): number {
  if (v === undefined) return dflt;
  const n = Number(v);
  return Number.isFinite(n) ? n : dflt;
}

export const CONFIG = {
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "admin",
  SESSION_SECRET: process.env.SESSION_SECRET || "dev-insecure-session-secret",
  DATABASE_URL: process.env.DATABASE_URL || "",
  // telemt Prometheus metrics (KPI tiles) and management REST API (campaigns).
  MTG_METRICS_URL: process.env.MTG_METRICS_URL || "http://127.0.0.1:9090/metrics",
  TELEMT_API_URL: process.env.TELEMT_API_URL || "http://127.0.0.1:9091",
  MTG_DOMAIN: process.env.MTG_DOMAIN || "cloudflare.com",
  SERVER_IP: process.env.SERVER_IP as string | undefined,
  MTG_PORT: num(process.env.MTG_PORT, 443),
  COLLECT_CONNECTIONS: bool(process.env.COLLECT_CONNECTIONS, true),
  GEOIP_PATH: process.env.GEOIP_PATH || "/app/data/geoip/city.mmdb",
  POLL_INTERVAL_MS: num(process.env.POLL_INTERVAL_MS, 5000),
} as const;
