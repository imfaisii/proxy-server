// Postgres access for AGGREGATE history and campaign DISPLAY metadata only.
// telemt is the source of truth for campaigns (users/secrets/ad-tags/links);
// here we persist just the human-facing bits telemt has no concept of — a
// friendly name and the promoted channel @handle — keyed by telemt username.
// PRIVACY: only aggregate metrics and this metadata are ever persisted here.
// Client IP / connection data MUST NEVER be written to the DB.
// Every function degrades gracefully (no-op / null / []) and NEVER throws.
import { Pool } from "pg";
import { CONFIG } from "@/lib/env";
import type { MtgMetrics } from "@/lib/metrics";

const warned = new Set<string>();
function warnOnce(msg: string, err?: unknown) {
  if (warned.has(msg)) return;
  warned.add(msg);
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
      CREATE TABLE IF NOT EXISTS campaign_meta (
        username text PRIMARY KEY,
        name text NOT NULL,
        channel text NOT NULL DEFAULT '',
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

export interface CampaignMetaRow {
  name: string;
  channel: string;
}

// username -> { name, channel }. Returns null when the DB is unconfigured or
// unreachable (callers then fall back to the telemt username as the label).
export async function getCampaignMeta(): Promise<Map<string, CampaignMetaRow> | null> {
  if (!dbConfigured()) return null;
  const p = getPool();
  if (!p) return null;
  try {
    const res = await p.query(`SELECT username, name, channel FROM campaign_meta`);
    const m = new Map<string, CampaignMetaRow>();
    for (const r of res.rows) {
      m.set(String(r.username), {
        name: String(r.name),
        channel: String(r.channel ?? ""),
      });
    }
    return m;
  } catch (err) {
    warnOnce("[db] getCampaignMeta failed", err);
    return null;
  }
}

export async function saveCampaignMeta(
  username: string,
  name: string,
  channel: string,
): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await p.query(
      `INSERT INTO campaign_meta (username, name, channel) VALUES ($1, $2, $3)
       ON CONFLICT (username) DO UPDATE SET name = EXCLUDED.name, channel = EXCLUDED.channel`,
      [username, name, channel],
    );
  } catch (err) {
    warnOnce("[db] saveCampaignMeta failed", err);
  }
}

export async function deleteCampaignMeta(username: string): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await p.query(`DELETE FROM campaign_meta WHERE username = $1`, [username]);
  } catch (err) {
    warnOnce("[db] deleteCampaignMeta failed", err);
  }
}

// Small key/value store (jsonb). Used for the global-default promo config so the
// hero toggle can restore the channel's ad-tag after it was switched off.
export async function getSetting<T = unknown>(key: string): Promise<T | null> {
  const p = getPool();
  if (!p) return null;
  try {
    const res = await p.query(`SELECT value FROM settings WHERE key = $1`, [key]);
    return res.rows[0] ? (res.rows[0].value as T) : null;
  } catch (err) {
    warnOnce("[db] getSetting failed", err);
    return null;
  }
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await p.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, JSON.stringify(value)],
    );
  } catch (err) {
    warnOnce("[db] setSetting failed", err);
  }
}
