// MTProxy Console — seed data, formatters, and pure derivations.
// Faithful port of the source design's data layer. All values are mock/seeded;
// the live numbers are driven by a client-side interval (see Console.tsx).

export const MONO = "var(--font-geist-mono), monospace";
export const SANS = "var(--font-geist-sans), system-ui, sans-serif";

export type Status = "active" | "idle";
export type RegionCode = "ME" | "EU" | "AS" | "AF" | "SA" | "NA" | "OC";

const G = 1024 * 1024 * 1024;
const M = 1024 * 1024;

export const SERVER = {
  ip: "188.245.40.122",
  port: 443,
  domain: "cloudflare.com",
  secret: "ee367e6c8afc2d9b41e5a7c0f83b6d2e1a636c6f7564666c6172652e636f6d",
  // ~73h 14m of uptime, fixed at module load for a stable demo value.
  startedAt: Date.now() - (1000 * 60 * 60 * 73 + 1000 * 60 * 14),
};

export const ADMIN_PASSWORD =
  process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin";

// [ip, code, country, city, region, sinceSecs, downBytes, upBytes, client, status]
type RawTuple = [
  string,
  string,
  string,
  string,
  RegionCode,
  number,
  number,
  number,
  string,
  Status,
];

const RAW_TUPLES: RawTuple[] = [
  ["151.241.88.34", "IR", "Iran", "Tehran", "ME", 8420, 2.4 * G, 188 * M, "Telegram Android", "active"],
  ["37.221.92.17", "RU", "Russia", "Moscow", "EU", 263400, 18.7 * G, 1.2 * G, "Telegram Desktop", "active"],
  ["95.181.44.120", "RU", "Russia", "Saint Petersburg", "EU", 12880, 4.1 * G, 320 * M, "Telegram iOS", "active"],
  ["2.176.55.201", "IR", "Iran", "Isfahan", "ME", 640, 92 * M, 11 * M, "Telegram Android", "active"],
  ["178.62.19.88", "UA", "Ukraine", "Kyiv", "EU", 47200, 9.3 * G, 740 * M, "Telegram Desktop", "active"],
  ["188.130.155.9", "RU", "Russia", "Kazan", "EU", 3100, 1.1 * G, 86 * M, "Telegram Web", "idle"],
  ["46.224.3.77", "IR", "Iran", "Shiraz", "ME", 18900, 6.8 * G, 510 * M, "Telegram iOS", "active"],
  ["77.91.78.140", "BY", "Belarus", "Minsk", "EU", 9050, 2.7 * G, 210 * M, "Telegram Android", "active"],
  ["5.34.180.66", "KZ", "Kazakhstan", "Almaty", "AS", 1420, 410 * M, 38 * M, "Telegram Desktop", "active"],
  ["109.74.55.12", "TR", "Turkey", "Istanbul", "ME", 73400, 12.4 * G, 980 * M, "Telegram iOS", "active"],
  ["185.220.101.5", "DE", "Germany", "Frankfurt", "EU", 2580, 880 * M, 64 * M, "Telegram Desktop", "active"],
  ["91.108.23.41", "RU", "Russia", "Novosibirsk", "AS", 6700, 1.9 * G, 140 * M, "Telegram Android", "idle"],
  ["2.144.9.200", "IR", "Iran", "Tabriz", "ME", 420, 64 * M, 7 * M, "Telegram Web", "active"],
  ["31.171.86.33", "UA", "Ukraine", "Lviv", "EU", 15600, 5.2 * G, 390 * M, "Telegram Android", "active"],
  ["80.94.92.18", "RU", "Russia", "Yekaterinburg", "AS", 940, 290 * M, 22 * M, "Telegram iOS", "active"],
  ["103.86.49.7", "IN", "India", "Mumbai", "AS", 34200, 7.6 * G, 560 * M, "Telegram Desktop", "active"],
  ["41.66.10.244", "EG", "Egypt", "Cairo", "AF", 5100, 1.4 * G, 98 * M, "Telegram Android", "active"],
  ["190.92.18.55", "VE", "Venezuela", "Caracas", "SA", 2200, 620 * M, 47 * M, "Telegram iOS", "idle"],
  ["202.55.144.9", "CN", "China", "Shanghai", "AS", 88100, 21.3 * G, 1.6 * G, "Telegram Desktop", "active"],
  ["176.59.200.31", "RU", "Russia", "Samara", "EU", 430, 71 * M, 8 * M, "Telegram Android", "active"],
  ["2.181.0.90", "IR", "Iran", "Mashhad", "ME", 26800, 8.1 * G, 620 * M, "Telegram iOS", "active"],
  ["185.4.132.20", "TR", "Turkey", "Ankara", "ME", 1180, 340 * M, 26 * M, "Telegram Web", "active"],
  ["46.53.249.4", "UZ", "Uzbekistan", "Tashkent", "AS", 7600, 2.2 * G, 170 * M, "Telegram Android", "active"],
  ["37.99.45.118", "RU", "Russia", "Rostov", "EU", 19400, 5.9 * G, 450 * M, "Telegram Desktop", "active"],
];

export interface RawConn {
  ip: string;
  code: string;
  country: string;
  city: string;
  region: RegionCode;
  since: number;
  down: number;
  up: number;
  client: string;
  status: Status;
}

export const RAW: RawConn[] = RAW_TUPLES.map(
  ([ip, code, country, city, region, since, down, up, client, status]) => ({
    ip,
    code,
    country,
    city,
    region,
    since,
    down,
    up,
    client,
    status,
  }),
);

export const REGION_META: Record<RegionCode, [string, string]> = {
  ME: ["Middle East", "#2d68f5"],
  EU: ["Europe", "#7c5cff"],
  AS: ["Asia", "#13b5a6"],
  AF: ["Africa", "#f59e0b"],
  SA: ["South America", "#e5484d"],
  NA: ["North America", "#0ea5e9"],
  OC: ["Oceania", "#84cc16"],
};

export const PALETTE = [
  "#2d68f5",
  "#7c5cff",
  "#13b5a6",
  "#f59e0b",
  "#e5484d",
  "#0ea5e9",
  "#84cc16",
  "#ec4899",
  "#64748b",
];

// ---- Formatters ----------------------------------------------------------

export function fb(b: number): string {
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let n = b;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  const d = n < 10 && i > 1 ? 2 : n < 100 && i > 0 ? 1 : 0;
  return n.toFixed(d) + " " + u[i];
}

export function fd(secs: number): string {
  let s = Math.floor(secs);
  const d = Math.floor(s / 86400);
  s %= 86400;
  const h = Math.floor(s / 3600);
  s %= 3600;
  const m = Math.floor(s / 60);
  const ss = s % 60;
  if (d) return d + "d " + h + "h";
  if (h) return h + "h " + m + "m";
  if (m) return m + "m " + ss + "s";
  return ss + "s";
}

export function fn(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

// ---- Live state ----------------------------------------------------------

export interface Live {
  active: number;
  totalDown: number;
  totalUp: number;
  rateDown: number;
  rateUp: number;
  blocked: number;
  delta: number;
  t: number;
  chart: number[];
  // Wall-clock reference, captured at mount and advanced each tick so render
  // stays pure (no Date.now() during render).
  now: number;
}

export const INITIAL_LIVE: Live = {
  active: 1284,
  totalDown: 4.82e12,
  totalUp: 9.1e11,
  rateDown: 86,
  rateUp: 14,
  blocked: 37,
  delta: 24,
  t: 0,
  chart: [],
  now: SERVER.startedAt,
};

// Uptime shown in the UI, in seconds (matches SERVER.startedAt's offset).
// Derived from the tick counter so render stays pure.
export const UPTIME_BASE_SECS = 73 * 3600 + 14 * 60;
export const TICK_MS = 2200;

// Deterministic 40-point history for the active-connections chart. Pure (no
// Math.random) so it can seed initial state without a render side effect.
export function seedChart(): number[] {
  const seed: number[] = [];
  let v = 1180;
  for (let i = 0; i < 40; i++) {
    v += Math.sin(i / 3) * 40 + Math.sin(i * 1.3 + 1) * 22 + Math.cos(i * 0.7) * 14;
    v = Math.max(900, Math.min(1600, v));
    seed.push(Math.round(v));
  }
  seed[seed.length - 1] = INITIAL_LIVE.active;
  return seed;
}

// ---- Connection display rows --------------------------------------------

export interface DisplayConn {
  idx: number;
  ip: string;
  code: string;
  country: string;
  city: string;
  region: RegionCode;
  client: string;
  since: number;
  dotColor: string;
  statusColor: string;
  statusBg: string;
  statusLabel: string;
  dur: string;
  down: string;
  up: string;
  rawDown: number;
  rawUp: number;
}

export function displayConns(t: number): DisplayConn[] {
  return RAW.map((r, idx) => ({
    idx,
    ip: r.ip,
    code: r.code,
    country: r.country,
    city: r.city,
    region: r.region,
    client: r.client,
    since: r.since,
    dotColor: r.status === "active" ? "#16a34a" : "#f59e0b",
    statusColor: r.status === "active" ? "#15803d" : "#b45309",
    statusBg: r.status === "active" ? "#e7f6ee" : "#fdf3e3",
    statusLabel: r.status === "active" ? "Active" : "Idle",
    dur: fd(r.since + (r.status === "active" ? t * 2 : 0)),
    down: fb(r.down),
    up: fb(r.up),
    rawDown: r.down,
    rawUp: r.up,
  }));
}

// ---- Aggregations --------------------------------------------------------

export interface CountryAgg {
  code: string;
  name: string;
  region: RegionCode;
  count: number;
  bytes: number;
}

export function countryAgg(): CountryAgg[] {
  const agg: Record<string, CountryAgg> = {};
  RAW.forEach((r) => {
    if (!agg[r.code])
      agg[r.code] = {
        code: r.code,
        name: r.country,
        region: r.region,
        count: 0,
        bytes: 0,
      };
    agg[r.code].count++;
    agg[r.code].bytes += r.down + r.up;
  });
  return Object.values(agg).sort((a, b) => b.count - a.count);
}

export interface CountryBar {
  code: string;
  name: string;
  count: number;
  bytes?: string;
  pct: number;
  barColor: string;
}

export function topCountries(n = 6): CountryBar[] {
  const arr = countryAgg();
  const maxC = arr[0] ? arr[0].count : 1;
  return arr.slice(0, n).map((c, i) => ({
    code: c.code,
    name: c.name,
    count: c.count,
    pct: Math.round((c.count / maxC) * 100),
    barColor: PALETTE[i % PALETTE.length],
  }));
}

export function geoCountries(): CountryBar[] {
  const arr = countryAgg();
  const maxC = arr[0] ? arr[0].count : 1;
  return arr.map((c, i) => ({
    code: c.code,
    name: c.name,
    count: c.count,
    bytes: fb(c.bytes),
    pct: Math.round((c.count / maxC) * 100),
    barColor: PALETTE[i % PALETTE.length],
  }));
}

export interface RegionBar {
  name: string;
  color: string;
  pct: number;
}

export function regionsAgg(): RegionBar[] {
  const rg: Record<string, number> = {};
  let totC = 0;
  RAW.forEach((r) => {
    rg[r.region] = (rg[r.region] || 0) + 1;
    totC++;
  });
  return Object.keys(rg)
    .sort((a, b) => rg[b] - rg[a])
    .map((k) => ({
      name: REGION_META[k as RegionCode][0],
      color: REGION_META[k as RegionCode][1],
      pct: Math.round((rg[k] / totC) * 100),
    }));
}

export function restrictedRawCount(): number {
  return RAW.filter(
    (r) =>
      ["ME", "EU", "AS"].includes(r.region) &&
      ["IR", "RU", "BY", "CN", "UZ", "KZ"].includes(r.code),
  ).length;
}

export function restrictedPct(): number {
  return Math.round((restrictedRawCount() / RAW.length) * 100);
}

// ---- KPIs ----------------------------------------------------------------

export interface Kpi {
  label: string;
  value: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  trend: string;
  trendColor: string;
  trendBg: string;
}

export function getKpis(s: Live): Kpi[] {
  return [
    {
      label: "Active connections",
      value: fn(s.active),
      icon: "wifi",
      iconBg: "#eaf2ff",
      iconColor: "#2d68f5",
      trend: "+" + s.delta + "/min",
      trendColor: "#15803d",
      trendBg: "#e7f6ee",
    },
    {
      label: "Downloaded (total)",
      value: fb(s.totalDown),
      icon: "down",
      iconBg: "#eaf2ff",
      iconColor: "#2d68f5",
      trend: s.rateDown + " Mbps",
      trendColor: "#3f6fb5",
      trendBg: "#eef3fb",
    },
    {
      label: "Uploaded (total)",
      value: fb(s.totalUp),
      icon: "up",
      iconBg: "#f1edff",
      iconColor: "#7c5cff",
      trend: s.rateUp + " Mbps",
      trendColor: "#6a52c7",
      trendBg: "#f1edff",
    },
    {
      label: "Replay attacks blocked",
      value: fn(s.blocked),
      icon: "shield",
      iconBg: "#fdeceb",
      iconColor: "#e5484d",
      trend: "24h",
      trendColor: "#9aa0aa",
      trendBg: "#f3f4f6",
    },
  ];
}

// ---- Health --------------------------------------------------------------

export interface HealthCard {
  label: string;
  value: string;
  sub: string;
  subColor: string;
  pct: number;
  color: string;
}

export function getHealth(s: Live): { uptime: string; cards: HealthCard[] } {
  const upSecs = UPTIME_BASE_SECS + s.t * (TICK_MS / 1000);
  return {
    uptime: fd(upSecs),
    cards: [
      { label: "Uptime", value: "99.98%", sub: fd(upSecs), subColor: "#9aa0aa", pct: 99.98, color: "#16a34a" },
      { label: "CPU load", value: "18%", sub: "1 core", subColor: "#9aa0aa", pct: 18, color: "#2d68f5" },
      { label: "Memory", value: "41%", sub: "412 MB", subColor: "#9aa0aa", pct: 41, color: "#7c5cff" },
      {
        label: "Bandwidth",
        value: s.rateDown + s.rateUp + " Mbps",
        sub: "of 1 Gbps",
        subColor: "#9aa0aa",
        pct: Math.round((s.rateDown + s.rateUp) / 10),
        color: "#13b5a6",
      },
    ],
  };
}

// ---- Campaigns -----------------------------------------------------------

export interface Campaign {
  name: string;
  channel: string;
  statusLabel: string;
  statusDot: string;
  initial: string;
  avatarBg: string;
  avatarColor: string;
  impressions: string;
  clicks: string;
  ctr: string;
}

const CAMP_RAW: [string, string, string, string, string, number, number][] = [
  ["CryptoSignals Pro", "@cryptosignals", "Active", "#15a05a", "#2d68f5", 128430, 5212],
  ["ProxyNews Updates", "@proxy_news", "Active", "#15a05a", "#7c5cff", 96120, 3840],
  ["VPN Deals Weekly", "@vpndeals", "Paused", "#9aa0aa", "#f59e0b", 41280, 1190],
];

export function getCampaigns(): Campaign[] {
  return CAMP_RAW.map((c) => ({
    name: c[0],
    channel: c[1],
    statusLabel: c[2],
    statusDot: c[3],
    initial: c[0][0],
    avatarBg: c[4] + "1a",
    avatarColor: c[4],
    impressions: fn(c[5]),
    clicks: fn(c[6]),
    ctr: ((c[6] / c[5]) * 100).toFixed(1) + "%",
  }));
}

export const FREQ_OPTS = ["On connect", "30 min", "2 hr"];

export const FILTER_DEF: [string, string][] = [
  ["all", "All"],
  ["active", "Active"],
  ["idle", "Idle"],
];

export interface NavDef {
  id: string;
  label: string;
  icon: string;
}

export const NAV_DEF: NavDef[] = [
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "connections", label: "Connections", icon: "activity" },
  { id: "geography", label: "Geography", icon: "globe" },
  { id: "campaigns", label: "Campaigns", icon: "mega" },
  { id: "settings", label: "Settings", icon: "sliders" },
];

export const SCREEN_TITLES: Record<string, [string, string]> = {
  overview: ["Overview", "Real-time proxy activity & health"],
  connections: ["Connections", "Every active session through your proxy"],
  geography: ["Geography", "Where your traffic comes from"],
  campaigns: ["Campaigns", "Sponsored channels & in-proxy messages"],
  settings: ["Settings", "Server configuration & security"],
};

export function tgLink(): string {
  return `tg://proxy?server=${SERVER.ip}&port=${SERVER.port}&secret=${SERVER.secret}`;
}
