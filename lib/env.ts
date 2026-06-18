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
  MTG_METRICS_URL: process.env.MTG_METRICS_URL || "http://127.0.0.1:3129/metrics",
  MTG_DOMAIN: process.env.MTG_DOMAIN || "cloudflare.com",
  MTG_SECRET_PATH: process.env.MTG_SECRET_PATH || "",
  SERVER_IP: process.env.SERVER_IP as string | undefined,
  MTG_PORT: num(process.env.MTG_PORT, 443),
  COLLECT_CONNECTIONS: bool(process.env.COLLECT_CONNECTIONS, true),
  GEOIP_PATH: process.env.GEOIP_PATH || "/data/GeoLite2-City.mmdb",
  POLL_INTERVAL_MS: num(process.env.POLL_INTERVAL_MS, 5000),
} as const;
