// API contract shared by the server (producers) and client (consumers).
// The server computes these shapes from REAL data when the proxy/metrics/DB are
// reachable, and falls back to the seeded demo data otherwise (source: "demo").
import type {
  Kpi,
  HealthCard,
  DisplayConn,
  CountryBar,
  RegionBar,
  Campaign,
} from "./data";

export type { Kpi, HealthCard, DisplayConn, CountryBar, RegionBar, Campaign };

export interface OverviewData {
  kpis: Kpi[];
  chart: number[];
  activeText: string;
  peakText: string;
  topCountries: CountryBar[];
  health: { uptime: string; cards: HealthCard[] };
  recent: DisplayConn[];
}

export interface ConnectionsData {
  connections: DisplayConn[];
  total: number;
  countryCount: number;
}

export interface CountryStat {
  code: string;
  country: string;
  region: string;
  peakDevices: number;
  lastDevices: number;
  firstSeen: string;
  lastSeen: string;
}

// All-time persisted stats (aggregate counts only — never individual IPs).
export interface GeoHistory {
  countries: CountryStat[];
  totalCountries: number;
  peakDevices: number;
}

export interface GeographyData {
  countries: CountryBar[];
  regions: RegionBar[];
  countryCount: number;
  total: number;
  restrictedPct: number;
  restrictedCount: string;
  history?: GeoHistory; // persisted all-time stats; absent when DB is unavailable
}

export interface ServerInfo {
  ip: string;
  port: number;
  domain: string;
  image: string;
  secretMasked: string;
  secret?: string; // only present when explicitly revealed by an authed request
  tgLink: string;
  tgLinkShort: string;
  uptime: string;
}

/**
 * The entire dashboard, returned by `GET /api/state` (auth required) and polled
 * by the client every few seconds. `source` tells the UI whether it's looking at
 * real proxy data or the seeded demo fallback.
 */
export interface DashboardState {
  overview: OverviewData;
  connections: ConnectionsData;
  geography: GeographyData;
  server: ServerInfo;
  campaigns: Campaign[];
  campaignOn: boolean;
  source: "live" | "demo";
  generatedAt: number;
}

export interface SessionState {
  authed: boolean;
}
