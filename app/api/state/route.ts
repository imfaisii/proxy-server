// GET /api/state — the polled dashboard payload (auth required).
// Tries to build a live DashboardState from the proxy; if there's no live
// signal, falls back to a demo state assembled from the seeded derivations.
// Any failure degrades to demo — this endpoint must never 500 the dashboard.
import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { buildLiveState } from "@/lib/aggregate";
import { getServerIp } from "@/lib/net";
import {
  INITIAL_LIVE,
  SERVER,
  getKpis,
  getHealth,
  getCampaigns,
  displayConns,
  topCountries,
  geoCountries,
  regionsAgg,
  restrictedPct,
  restrictedRawCount,
  countryAgg,
  seedChart,
  fn,
} from "@/lib/data";
import type { DashboardState } from "@/lib/types";

export const dynamic = "force-dynamic";

async function demoState(): Promise<DashboardState> {
  const conns = displayConns(0);
  const countryCount = countryAgg().length;
  const chart = seedChart();
  const health = getHealth(INITIAL_LIVE);
  const campaigns = getCampaigns();
  const globalCamp = campaigns.find((c) => c.isGlobal);
  const secret = SERVER.secret;
  const ip = await getServerIp();
  const link = `tg://proxy?server=${ip}&port=${SERVER.port}&secret=${secret}`;

  const now = Date.now();
  const demoHistory = {
    countries: countryAgg()
      .slice(0, 12)
      .map((c, i) => ({
        code: c.code,
        country: c.name,
        region: c.region,
        peakDevices: c.count + 2,
        lastDevices: c.count,
        firstSeen: new Date(now - (3 * 86400000 + i * 3600000)).toISOString(),
        lastSeen: new Date(now - i * 60000).toISOString(),
      })),
    totalCountries: countryCount,
    peakDevices: INITIAL_LIVE.active,
  };

  return {
    overview: {
      kpis: getKpis(INITIAL_LIVE),
      chart,
      activeText: fn(INITIAL_LIVE.active),
      peakText: fn(Math.max(...chart)),
      topCountries: topCountries(6),
      health,
      recent: conns.slice(0, 8),
    },
    connections: {
      connections: conns,
      total: conns.length,
      countryCount,
    },
    geography: {
      countries: geoCountries(),
      regions: regionsAgg(),
      countryCount,
      total: conns.length,
      restrictedPct: restrictedPct(),
      restrictedCount: fn(restrictedRawCount()),
      history: demoHistory,
    },
    server: {
      ip,
      port: SERVER.port,
      domain: SERVER.domain,
      image: "ghcr.io/telemt/telemt",
      secretMasked:
        secret.slice(0, 6) + "•".repeat(12) + secret.slice(-6),
      secret,
      tgLink: link,
      tgLinkShort: `t.me/proxy?server=${ip}&port=${SERVER.port}`,
      uptime: health.uptime,
    },
    campaigns,
    campaignOn: globalCamp ? globalCamp.active : false,
    source: "demo",
    generatedAt: Date.now(),
  };
}

export async function GET(req: Request) {
  if (!(await isAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let state: DashboardState;
  try {
    state = (await buildLiveState()) ?? (await demoState());
  } catch {
    state = await demoState();
  }

  return NextResponse.json(state);
}
