// Postgres access for AGGREGATE history and campaigns.
// PRIVACY: only aggregate metrics and campaign config are ever persisted here.
// Client IP / connection data MUST NEVER be written to the DB.
// Every function degrades gracefully (no-op / null / []) and NEVER throws.
import { Pool } from "pg";
import { CONFIG } from "@/lib/env";
import { fn, PALETTE, type Campaign } from "@/lib/data";
import type { MtgMetrics } from "@/lib/metrics";

let warned = false;
function warnOnce(msg: string, err?: unknown) {
  if (warned) return;
  warned = true;
  console.warn(msg, err ?? "");
}

let pool: Pool | null = null;
let poolTried = false;

function getPool(): Pool | null {
  if (!CONFIG.DATABASE_URL) return null;
  if (poolTried) return pool;
  poolTried = true;
  try {
    pool = new Pool({ connectionString: CONFIG.DATABASE_URL, max: 5 });
    pool.on("error", (err) => warnOnce("[db] pool error", err));
  } catch (err) {
    warnOnce("[db] failed to create pool", err);
    pool = null;
  }
  return pool;
}

export function dbConfigured(): boolean {
  return !!CONFIG.DATABASE_URL;
}

export async function ensureSchema(): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await p.query(`
      CREATE TABLE IF NOT EXISTS metrics_history (
        id bigserial PRIMARY KEY,
        ts timestamptz NOT NULL DEFAULT now(),
        active int,
        total_down bigint,
        total_up bigint,
        rate_down int,
        rate_up int,
        blocked int
      );
      CREATE TABLE IF NOT EXISTS campaigns (
        id serial PRIMARY KEY,
        name text NOT NULL,
        channel text NOT NULL,
        status text NOT NULL DEFAULT 'Active',
        impressions bigint DEFAULT 0,
        clicks bigint DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS settings (
        key text PRIMARY KEY,
        value jsonb
      );
    `);
  } catch (err) {
    warnOnce("[db] ensureSchema failed", err);
  }
}

export async function recordMetrics(m: MtgMetrics): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await p.query(
      `INSERT INTO metrics_history (active, total_down, total_up, rate_down, rate_up, blocked)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        Math.round(m.activeConnections),
        Math.round(m.totalDown),
        Math.round(m.totalUp),
        Math.round(m.rateDown),
        Math.round(m.rateUp),
        Math.round(m.replayAttacks),
      ],
    );
  } catch (err) {
    warnOnce("[db] recordMetrics failed", err);
  }
}

export async function getActiveHistory(points: number): Promise<number[]> {
  const p = getPool();
  if (!p) return [];
  try {
    const res = await p.query(
      `SELECT active FROM metrics_history ORDER BY ts DESC LIMIT $1`,
      [points],
    );
    // Newest-first from the query; reverse to ascending (oldest -> newest).
    return res.rows
      .map((r) => Number(r.active) || 0)
      .reverse();
  } catch (err) {
    warnOnce("[db] getActiveHistory failed", err);
    return [];
  }
}

function toCampaign(row: {
  name: string;
  channel: string;
  status: string;
  impressions: number | string;
  clicks: number | string;
}, idx: number): Campaign {
  const impressions = Number(row.impressions) || 0;
  const clicks = Number(row.clicks) || 0;
  const color = PALETTE[idx % PALETTE.length];
  const active = String(row.status).toLowerCase() === "active";
  return {
    name: row.name,
    channel: row.channel,
    statusLabel: row.status,
    statusDot: active ? "#15a05a" : "#9aa0aa",
    initial: row.name ? row.name[0] : "?",
    avatarBg: color + "1a",
    avatarColor: color,
    impressions: fn(impressions),
    clicks: fn(clicks),
    ctr: (impressions > 0 ? (clicks / impressions) * 100 : 0).toFixed(1) + "%",
  };
}

export async function listCampaigns(): Promise<Campaign[] | null> {
  if (!dbConfigured()) return null;
  const p = getPool();
  if (!p) return null;
  try {
    const res = await p.query(
      `SELECT name, channel, status, impressions, clicks
       FROM campaigns ORDER BY created_at ASC, id ASC`,
    );
    return res.rows.map((r, i) => toCampaign(r, i));
  } catch (err) {
    warnOnce("[db] listCampaigns failed", err);
    return null;
  }
}

export async function saveCampaign(c: {
  name: string;
  channel: string;
  status: string;
}): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await p.query(
      `INSERT INTO campaigns (name, channel, status) VALUES ($1, $2, $3)`,
      [c.name, c.channel, c.status],
    );
  } catch (err) {
    warnOnce("[db] saveCampaign failed", err);
  }
}
