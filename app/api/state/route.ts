// GET /api/state — the polled dashboard payload (auth required).
// Tries to build a live DashboardState from the proxy; if there's no live
// signal, falls back to a demo state assembled from the seeded derivations.
// Any failure degrades to demo — this endpoint must never 500 the dashboard.
import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { buildLiveState } from "@/lib/aggregate";
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
  tgLink,
  fn,
} from "@/lib/data";
import type { DashboardState } from "@/lib/types";

export const dynamic = "force-dynamic";

function demoState(): DashboardState {
  const conns = displayConns(0);
  const countryCount = countryAgg().length;
  const chart = seedChart();
  const health = getHealth(INITIAL_LIVE);
  const secret = SERVER.secret;
  const link = tgLink();

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
    },
    server: {
      ip: SERVER.ip,
      port: SERVER.port,
      domain: SERVER.domain,
      image: "nineseconds/mtg:2",
      secretMasked:
        secret.slice(0, 6) + "•".repeat(12) + secret.slice(-6),
      secret,
      tgLink: link,
      tgLinkShort: `t.me/proxy?server=${SERVER.ip}&port=${SERVER.port}`,
      uptime: health.uptime,
    },
    campaigns: getCampaigns(),
    campaignOn: true,
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
    state = (await buildLiveState()) ?? demoState();
  } catch {
    state = demoState();
  }

  return NextResponse.json(state);
}
