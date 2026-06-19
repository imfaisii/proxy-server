// Client for telemt's management REST API (default http://127.0.0.1:9091).
// telemt is the SOURCE OF TRUTH for proxy state: access-users (each with its own
// secret + connect link) and their per-user ad-tags (promoted channels). A
// "campaign" in the console == one telemt user. Postgres only holds display
// metadata (friendly name, @handle) keyed by username — see lib/db.ts.
//
// Every call degrades gracefully (returns null/false, never throws) so the
// console keeps working — and falls back to demo — when telemt is unreachable.
//
// NOTE: field names below follow telemt's documented API (UserInfo:
// current_connections, active_unique_ips, total_octets, user_ad_tag, links{...}).
// Confirm against the running telemt version if a field ever reads empty.
import { CONFIG } from "@/lib/env";
import { fb, fn, PALETTE, type Campaign } from "@/lib/data";

export interface TelemtLinks {
  classic?: string[];
  secure?: string[];
  tls?: string[];
  tls_domains?: string[];
}

export interface TelemtUser {
  username: string;
  secret?: string;
  user_ad_tag?: string | null;
  current_connections?: number;
  active_unique_ips?: number;
  total_octets?: number;
  enabled?: boolean; // telemt reports `true` when the override is absent
  links?: TelemtLinks;
}

// telemt's create response: { user: UserInfo, secret } (secret is server-generated).
interface TelemtCreateResponse {
  user?: TelemtUser;
  secret?: string;
}

// The primary shared user. Its link is the console's main connection link and
// its ad-tag is the "global" promoted channel for everyone on that link.
export const PRIMARY_USER = "main";

// Per-message throttle so one transient failure doesn't mute later, unrelated
// warnings for the process lifetime.
const warned = new Set<string>();
function warnOnce(msg: string, err?: unknown) {
  if (warned.has(msg)) return;
  warned.add(msg);
  console.warn(msg, err ?? "");
}

const BASE = CONFIG.TELEMT_API_URL.replace(/\/$/, "");

// telemt wraps EVERY success response in { ok:true, data:<payload>, revision }.
// api() returns the unwrapped `data` payload (or null on failure / ok:false),
// tolerating a bare payload too in case a future version drops the envelope.
async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(BASE + path, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      warnOnce(`[telemt] ${init?.method ?? "GET"} ${path} -> HTTP ${res.status}`);
      return null;
    }
    // Some endpoints may return empty bodies (treated as success).
    const text = await res.text();
    if (!text) return {} as T;
    const body = JSON.parse(text);
    if (body && typeof body === "object" && typeof (body as { ok?: unknown }).ok === "boolean") {
      const env = body as { ok: boolean; data?: unknown; error?: unknown };
      if (!env.ok) {
        warnOnce(`[telemt] ${init?.method ?? "GET"} ${path} -> ok:false`, env.error);
        return null;
      }
      return (env.data ?? {}) as T;
    }
    return body as T; // bare payload (no envelope)
  } catch (err) {
    warnOnce(`[telemt] could not reach telemt API at ${BASE}${path}`, err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// api() already unwraps the envelope, so list endpoints arrive as a bare array;
// tolerate a stray { data:[...] } too.
function unwrap<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[];
  if (body && typeof body === "object" && Array.isArray((body as { data?: unknown }).data)) {
    return (body as { data: T[] }).data;
  }
  return [];
}

export async function listUsers(): Promise<TelemtUser[] | null> {
  const body = await api<unknown>("/v1/users");
  if (body === null) return null;
  return unwrap<TelemtUser>(body);
}

export async function getUser(username: string): Promise<TelemtUser | null> {
  return api<TelemtUser>(`/v1/users/${encodeURIComponent(username)}`);
}

// Global proxy totals summed from the user list — a reliable fallback for the
// KPI tiles when the Prometheus endpoint is unavailable. total_octets is not
// direction-split, so callers map it to "downloaded" with 0 "uploaded".
export async function apiMetrics(): Promise<{
  activeConnections: number;
  totalOctets: number;
  devices: number;
} | null> {
  const users = await listUsers();
  if (!users) return null;
  let activeConnections = 0;
  let totalOctets = 0;
  let devices = 0;
  for (const u of users) {
    activeConnections += u.current_connections ?? 0;
    totalOctets += u.total_octets ?? 0;
    devices += u.active_unique_ips ?? 0;
  }
  return { activeConnections, totalOctets, devices };
}

export async function createUser(input: {
  username: string;
  adTag?: string;
}): Promise<TelemtUser | null> {
  const body: Record<string, unknown> = { username: input.username };
  if (input.adTag) body.user_ad_tag = input.adTag;
  const data = await api<TelemtCreateResponse | TelemtUser>("/v1/users", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!data) return null;
  // POST returns { user: UserInfo, secret }; flatten so the secret rides along
  // with the user view. Tolerate a bare UserInfo if the shape ever changes.
  const c = data as TelemtCreateResponse;
  if (c.user) return { ...c.user, secret: c.secret };
  return data as TelemtUser;
}

// JSON Merge Patch: set ad-tag with a string, clear it with null.
export async function patchUser(
  username: string,
  patch: { user_ad_tag?: string | null },
): Promise<TelemtUser | null> {
  return api<TelemtUser>(`/v1/users/${encodeURIComponent(username)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function setUserEnabled(
  username: string,
  enabled: boolean,
): Promise<boolean> {
  const action = enabled ? "enable" : "disable";
  const res = await api<unknown>(
    `/v1/users/${encodeURIComponent(username)}/${action}`,
    { method: "POST" },
  );
  return res !== null;
}

export async function deleteUser(username: string): Promise<boolean> {
  const res = await api<unknown>(`/v1/users/${encodeURIComponent(username)}`, {
    method: "DELETE",
  });
  return res !== null;
}

// ---- Mapping to the UI's Campaign shape ----------------------------------

export function bestLink(u: TelemtUser): string {
  const l = u.links;
  return l?.tls?.[0] || l?.secure?.[0] || l?.classic?.[0] || "";
}

export interface LinkHost {
  ip: string;
  port: number;
}

// telemt fills the link's server field from its own IP auto-detection, which can
// be wrong behind NAT. Rebuild the link with the IP/port the console advertises,
// keeping telemt's (FakeTLS) secret. Returns the original if no secret is present.
export function rebuildLink(link: string, host: LinkHost): string {
  if (!link) return "";
  const m = link.match(/[?&]secret=([^&]+)/);
  if (!m) return link;
  return `tg://proxy?server=${host.ip}&port=${host.port}&secret=${m[1]}`;
}

export function maskTag(tag: string | null | undefined): string {
  if (!tag) return "";
  if (tag.length <= 10) return tag;
  return tag.slice(0, 4) + "••••" + tag.slice(-4);
}

function isEnabled(u: TelemtUser): boolean {
  // telemt omits `enabled` (reports true) when there's no disable override.
  return u.enabled !== false;
}

export interface CampaignMeta {
  name: string;
  channel: string;
}

// Build the full campaign list from telemt + display metadata (passed in so this
// module stays free of any DB import). The primary "main" user sorts first.
// Returns null when telemt is unreachable so the caller can fall back to demo.
export async function listCampaigns(
  meta: Map<string, CampaignMeta> | null,
  host?: LinkHost,
): Promise<Campaign[] | null> {
  const users = await listUsers();
  if (!users) return null;
  const sorted = [...users].sort((a, b) => {
    if (a.username === PRIMARY_USER) return -1;
    if (b.username === PRIMARY_USER) return 1;
    return a.username.localeCompare(b.username);
  });
  return sorted.map((u, i) => toCampaign(u, meta?.get(u.username), i, host));
}

export function toCampaign(
  u: TelemtUser,
  meta: CampaignMeta | undefined,
  idx: number,
  host?: LinkHost,
): Campaign {
  const tag = u.user_ad_tag || "";
  const enabled = isEnabled(u);
  // A campaign is "Active" only when it's actually promoting: enabled + has a tag.
  const active = enabled && !!tag;
  const color = PALETTE[idx % PALETTE.length];
  const name = meta?.name || u.username;
  const channel = meta?.channel || "";
  const raw = bestLink(u);
  return {
    username: u.username,
    name,
    channel,
    link: host ? rebuildLink(raw, host) : raw,
    adTagMasked: maskTag(tag),
    isGlobal: u.username === PRIMARY_USER,
    enabled,
    active,
    statusLabel: active ? "Active" : tag ? "Paused" : "No tag",
    statusDot: active ? "#15a05a" : "#9aa0aa",
    initial: (name[0] || "?").toUpperCase(),
    avatarBg: color + "1a",
    avatarColor: color,
    devices: fn(u.active_unique_ips ?? 0),
    live: fn(u.current_connections ?? 0),
    data: fb(u.total_octets ?? 0),
  };
}
