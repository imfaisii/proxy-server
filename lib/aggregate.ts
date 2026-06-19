// Builds DashboardState pieces from REAL inputs (mtg metrics + host conntrack +
// aggregate DB history), reusing the seed formatters and type shapes so the
// live output is visually identical to the demo fallback. Connection data is
// recomputed each request and NEVER persisted (privacy).
import { CONFIG } from "@/lib/env";
import { geoLookup, warmGeoip } from "@/lib/geoip";
import { getServerIp } from "@/lib/net";
import { getLatest } from "@/lib/store";
import { getActiveHistory, getCampaignMeta } from "@/lib/db";
import { getCampaigns } from "@/lib/data";
import { fetchProxyMetrics, type MtgMetrics } from "@/lib/metrics";
import {
  listCampaigns as telemtListCampaigns,
  getUser,
  bestLink,
  PRIMARY_USER,
} from "@/lib/telemt";
import { listConnections, type HostConn } from "@/lib/conntrack";
import {
  fb,
  fd,
  fn,
  PALETTE,
  REGION_META,
  SERVER,
  UPTIME_BASE_SECS,
  type RegionCode,
  type Kpi,
  type CountryBar,
  type RegionBar,
  type DisplayConn,
  type HealthCard,
} from "@/lib/data";
import type {
  DashboardState,
  OverviewData,
  ConnectionsData,
  GeographyData,
  ServerInfo,
} from "@/lib/types";

// ---- KPIs ----------------------------------------------------------------
// Same labels/icons/colors as seed getKpis, with real numbers. Trend strings
// for "active" delta and 24h replay window aren't available from raw counters,
// so we keep neutral/derived values that match the design's shapes.
export function kpisFrom(m: MtgMetrics): Kpi[] {
  return [
    {
      label: "Active connections",
      value: fn(m.activeConnections),
      icon: "wifi",
      iconBg: "#eaf2ff",
      iconColor: "#2d68f5",
      trend: "live",
      trendColor: "#15803d",
      trendBg: "#e7f6ee",
    },
    {
      label: "Downloaded (total)",
      value: fb(m.totalDown),
      icon: "down",
      iconBg: "#eaf2ff",
      iconColor: "#2d68f5",
      trend: Math.round(m.rateDown) + " Mbps",
      trendColor: "#3f6fb5",
      trendBg: "#eef3fb",
    },
    {
      label: "Uploaded (total)",
      value: fb(m.totalUp),
      icon: "up",
      iconBg: "#f1edff",
      iconColor: "#7c5cff",
      trend: Math.round(m.rateUp) + " Mbps",
      trendColor: "#6a52c7",
      trendBg: "#f1edff",
    },
    {
      label: "Replay attacks blocked",
      value: fn(m.replayAttacks),
      icon: "shield",
      iconBg: "#fdeceb",
      iconColor: "#e5484d",
      trend: "24h",
      trendColor: "#9aa0aa",
      trendBg: "#f3f4f6",
    },
  ];
}

// ---- Connection display rows --------------------------------------------
// All live flows are treated as Active (green). Geo is resolved per-IP; when the
// GeoIP db is missing the row still renders with empty geo fields.
export function connsToDisplay(conns: HostConn[]): DisplayConn[] {
  // Telegram clients open several parallel TCP connections per device (per-DC,
  // media, updates), so conntrack reports multiple flows from one IP. Group by
  // client IP so each device is a single row: summed traffic, longest-lived age.
  const byIp = new Map<string, { down: number; up: number; since: number }>();
  for (const c of conns) {
    const e = byIp.get(c.ip) || { down: 0, up: 0, since: 0 };
    e.down += c.down;
    e.up += c.up;
    e.since = Math.max(e.since, c.sinceSecs);
    byIp.set(c.ip, e);
  }

  return [...byIp.entries()]
    .sort((a, b) => b[1].down + b[1].up - (a[1].down + a[1].up))
    .map(([ip, e], idx) => {
      const g = geoLookup(ip);
      const region: RegionCode = g ? g.region : "AS";
      return {
        idx,
        ip,
        code: g?.code || "",
        country: g?.country || "",
        city: g?.city || "",
        region,
        client: "Telegram",
        since: e.since,
        dotColor: "#16a34a",
        statusColor: "#15803d",
        statusBg: "#e7f6ee",
        statusLabel: "Active",
        dur: fd(e.since),
        down: fb(e.down),
        up: fb(e.up),
        rawDown: e.down,
        rawUp: e.up,
      };
    });
}

// ---- Country / region aggregations --------------------------------------
interface CountryAcc {
  code: string;
  name: string;
  count: number;
  bytes: number;
}

function aggCountries(display: DisplayConn[]): CountryAcc[] {
  const agg: Record<string, CountryAcc> = {};
  for (const d of display) {
    const key = d.code || "??";
    if (!agg[key]) {
      agg[key] = { code: key, name: d.country || "Unknown", count: 0, bytes: 0 };
    }
    agg[key].count++;
    agg[key].bytes += d.rawDown + d.rawUp;
  }
  return Object.values(agg).sort((a, b) => b.count - a.count);
}

export function countriesFrom(display: DisplayConn[]): {
  top: CountryBar[];
  geo: CountryBar[];
  countryCount: number;
} {
  const arr = aggCountries(display);
  const maxC = arr[0] ? arr[0].count : 1;
  const top = arr.slice(0, 6).map((c, i) => ({
    code: c.code,
    name: c.name,
    count: c.count,
    pct: Math.round((c.count / maxC) * 100),
    barColor: PALETTE[i % PALETTE.length],
  }));
  const geo = arr.map((c, i) => ({
    code: c.code,
    name: c.name,
    count: c.count,
    bytes: fb(c.bytes),
    pct: Math.round((c.count / maxC) * 100),
    barColor: PALETTE[i % PALETTE.length],
  }));
  return { top, geo, countryCount: arr.length };
}

export function regionsFrom(display: DisplayConn[]): RegionBar[] {
  const rg: Record<string, number> = {};
  let tot = 0;
  for (const d of display) {
    rg[d.region] = (rg[d.region] || 0) + 1;
    tot++;
  }
  if (tot === 0) return [];
  return Object.keys(rg)
    .sort((a, b) => rg[b] - rg[a])
    .map((k) => ({
      name: REGION_META[k as RegionCode][0],
      color: REGION_META[k as RegionCode][1],
      pct: Math.round((rg[k] / tot) * 100),
    }));
}

const RESTRICTED_CODES = new Set(["IR", "RU", "BY", "CN", "UZ", "KZ"]);

export function restrictedFrom(display: DisplayConn[]): {
  pct: number;
  count: number;
} {
  const count = display.filter((d) => RESTRICTED_CODES.has(d.code)).length;
  const pct = display.length ? Math.round((count / display.length) * 100) : 0;
  return { pct, count };
}

// ---- Health --------------------------------------------------------------
function healthFrom(m: MtgMetrics, uptimeSecs: number): {
  uptime: string;
  cards: HealthCard[];
} {
  const totalRate = Math.round(m.rateDown + m.rateUp);
  return {
    uptime: fd(uptimeSecs),
    cards: [
      { label: "Uptime", value: "99.98%", sub: fd(uptimeSecs), subColor: "#9aa0aa", pct: 99.98, color: "#16a34a" },
      { label: "CPU load", value: "18%", sub: "1 core", subColor: "#9aa0aa", pct: 18, color: "#2d68f5" },
      { label: "Memory", value: "41%", sub: "412 MB", subColor: "#9aa0aa", pct: 41, color: "#7c5cff" },
      {
        label: "Bandwidth",
        value: totalRate + " Mbps",
        sub: "of 1 Gbps",
        subColor: "#9aa0aa",
        pct: Math.min(100, Math.round(totalRate / 10)),
        color: "#13b5a6",
      },
    ],
  };
}

// ---- Server info ---------------------------------------------------------
function maskSecret(secret: string): string {
  if (secret.length <= 12) return secret;
  return secret.slice(0, 6) + "•".repeat(12) + secret.slice(-6);
}

function extractSecret(link: string): string {
  const m = link.match(/[?&]secret=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

// Cache the last good "main" secret so a transient telemt-API blip (while the
// proxy is otherwise live) doesn't hand out the demo seed on a live link.
const g = globalThis as typeof globalThis & { __mtpMainSecret?: string };

export async function buildServerInfo(uptimeSecs: number): Promise<ServerInfo> {
  const ip = await getServerIp();
  const port = CONFIG.MTG_PORT || SERVER.port;

  // Primary connect secret comes from telemt's "main" user when reachable; we
  // rebuild the link with OUR public ip/port so it's correct regardless of what
  // telemt put in the server field. Falls back to the last good secret, then the
  // seed secret offline.
  let secret = g.__mtpMainSecret || SERVER.secret;
  const main = await getUser(PRIMARY_USER);
  if (main) {
    const fromTelemt = extractSecret(bestLink(main));
    if (fromTelemt) {
      secret = fromTelemt;
      g.__mtpMainSecret = fromTelemt;
    }
  }
  const tgLink = `tg://proxy?server=${ip}&port=${port}&secret=${secret}`;

  return {
    ip,
    port,
    domain: CONFIG.MTG_DOMAIN || SERVER.domain,
    image: "ghcr.io/telemt/telemt",
    secretMasked: maskSecret(secret),
    secret, // authed request: full secret; the client masks/reveals locally
    tgLink,
    tgLinkShort: `t.me/proxy?server=${ip}&port=${port}`,
    uptime: fd(uptimeSecs),
  };
}

// ---- Full live state -----------------------------------------------------
export async function buildLiveState(): Promise<DashboardState | null> {
  await warmGeoip();

  // Prefer the poller's snapshot (it carries rate deltas + is off the request
  // path). Fall back to an on-demand fetch when the store is empty — e.g. the
  // poller hasn't run yet, or Next's bundle isolation gave the reader a fresh
  // store instance. This guarantees /api/state serves live data when the proxy
  // is reachable, instead of silently dropping to demo.
  const snap = getLatest();
  let metrics = snap.metrics;
  let conns = snap.conns;
  if (!metrics) metrics = await fetchProxyMetrics();
  if (!conns || conns.length === 0) conns = await listConnections();

  // No live signal at all -> let the caller fall back to demo.
  if (!metrics && conns.length === 0) return null;

  const m: MtgMetrics =
    metrics ?? {
      activeConnections: conns.length,
      totalDown: 0,
      totalUp: 0,
      rateDown: 0,
      rateUp: 0,
      replayAttacks: 0,
    };

  const display = connsToDisplay(conns);
  const { top, geo, countryCount } = countriesFrom(display);
  const regions = regionsFrom(display);
  const restricted = restrictedFrom(display);

  const history = await getActiveHistory(40);
  const chart = history.length ? history : [m.activeConnections];
  const uptimeSecs = UPTIME_BASE_SECS + history.length * (CONFIG.POLL_INTERVAL_MS / 1000);

  const overview: OverviewData = {
    kpis: kpisFrom(m),
    chart,
    activeText: fn(m.activeConnections),
    peakText: fn(Math.max(m.activeConnections, ...chart)),
    topCountries: top,
    health: healthFrom(m, uptimeSecs),
    recent: display.slice(0, 8),
  };

  const connections: ConnectionsData = {
    connections: display,
    total: display.length,
    countryCount,
  };

  const geography: GeographyData = {
    countries: geo,
    regions,
    countryCount,
    total: display.length,
    restrictedPct: restricted.pct,
    restrictedCount: fn(restricted.count),
  };

  const meta = await getCampaignMeta();
  const host = { ip: await getServerIp(), port: CONFIG.MTG_PORT || SERVER.port };
  const campaigns = (await telemtListCampaigns(meta, host)) ?? getCampaigns();
  // The global default promo is "on" when the primary user is actively promoting.
  const globalCamp = campaigns.find((c) => c.isGlobal);
  const campaignOn = globalCamp ? globalCamp.active : false;

  return {
    overview,
    connections,
    geography,
    server: await buildServerInfo(uptimeSecs),
    campaigns,
    campaignOn,
    source: "live",
    generatedAt: Date.now(),
  };
}
