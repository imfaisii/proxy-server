// Campaigns CRUD. telemt is the source of truth (users + per-user ad-tags +
// connect links); Postgres holds only the display metadata (friendly name,
// @handle) and the global-default promo config. All methods are auth-gated.
//
//   GET                       -> Campaign[] (live from telemt; demo fallback)
//   POST  {name, channel,        create a per-campaign user (+ ad-tag), or, with
//          adTag, global?}       global:true, configure the primary "main" user
//   PATCH {username, ...}        pause/resume (enabled), retag (adTag), or the
//                                global on/off toggle ({username:"main", on})
//   DELETE {username}            remove a campaign (never the primary link)
import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { CONFIG } from "@/lib/env";
import { getServerIp } from "@/lib/net";
import {
  listUsers,
  listCampaigns as telemtListCampaigns,
  createUser,
  patchUser,
  setUserEnabled,
  deleteUser,
  getUser,
  bestLink,
  rebuildLink,
  PRIMARY_USER,
  type LinkHost,
} from "@/lib/telemt";
import {
  getCampaignMeta,
  saveCampaignMeta,
  deleteCampaignMeta,
  getSetting,
  setSetting,
} from "@/lib/db";
import { getCampaigns } from "@/lib/data";

export const dynamic = "force-dynamic";

async function linkHost(): Promise<LinkHost> {
  return { ip: await getServerIp(), port: CONFIG.MTG_PORT };
}

const GLOBAL_PROMO_KEY = "global_promo";
interface GlobalPromo {
  name: string;
  channel: string;
  adTag: string;
}

const TAG_RE = /^[0-9a-f]{32}$/;

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

function normChannel(v: unknown): string {
  const s = str(v).replace(/^@+/, "");
  return s ? "@" + s : "";
}

function normTag(v: unknown): string {
  return str(v).toLowerCase();
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24) || "camp";
}

function uniqueUsername(base: string, taken: Set<string>): string {
  let u = "c_" + base;
  let n = 2;
  while (taken.has(u)) {
    u = "c_" + base + n;
    n++;
  }
  return u;
}

const unauthorized = () =>
  NextResponse.json({ error: "unauthorized" }, { status: 401 });
const badRequest = (msg: string) =>
  NextResponse.json({ error: msg }, { status: 400 });
const upstream = () =>
  NextResponse.json({ error: "telemt unavailable" }, { status: 502 });

export async function GET(req: Request) {
  if (!(await isAuthed(req))) return unauthorized();
  const meta = await getCampaignMeta();
  const campaigns = (await telemtListCampaigns(meta, await linkHost())) ?? getCampaigns();
  return NextResponse.json(campaigns);
}

export async function POST(req: Request) {
  if (!(await isAuthed(req))) return unauthorized();

  let name = "";
  let channel = "";
  let adTag = "";
  let global = false;
  try {
    const b = (await req.json()) as Record<string, unknown>;
    name = str(b.name);
    channel = normChannel(b.channel);
    adTag = normTag(b.adTag);
    global = b.global === true;
  } catch {
    /* validated below */
  }

  if (!name) return badRequest("name is required");
  if (adTag && !TAG_RE.test(adTag)) {
    return badRequest("ad-tag must be 32 hex characters (from @MTProxybot)");
  }

  const host = await linkHost();

  // Configure the global default channel on the primary "main" user.
  if (global) {
    const patched = await patchUser(PRIMARY_USER, { user_ad_tag: adTag || null });
    if (patched === null) return upstream();
    await saveCampaignMeta(PRIMARY_USER, name, channel);
    await setSetting(GLOBAL_PROMO_KEY, { name, channel, adTag } satisfies GlobalPromo);
    const u = await getUser(PRIMARY_USER);
    return NextResponse.json({
      ok: true,
      username: PRIMARY_USER,
      link: u ? rebuildLink(bestLink(u), host) : "",
    });
  }

  // Per-campaign user: pick a free username, create it in telemt with its tag.
  const users = await listUsers();
  if (users === null) return upstream();
  const taken = new Set(users.map((u) => u.username));
  const username = uniqueUsername(slug(name), taken);

  const created = await createUser({ username, adTag: adTag || undefined });
  if (created === null) return upstream();
  await saveCampaignMeta(username, name, channel);
  return NextResponse.json({
    ok: true,
    username,
    link: rebuildLink(bestLink(created), host),
    secret: created.secret,
  });
}

export async function PATCH(req: Request) {
  if (!(await isAuthed(req))) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return badRequest("invalid body");
  }

  const username = str(body.username);
  if (!username) return badRequest("username is required");

  // Global on/off: clear the primary tag, or restore it from the saved config.
  if (username === PRIMARY_USER && typeof body.on === "boolean") {
    if (body.on) {
      const g = await getSetting<GlobalPromo>(GLOBAL_PROMO_KEY);
      if (!g?.adTag) return badRequest("no global channel configured yet");
      const r = await patchUser(PRIMARY_USER, { user_ad_tag: g.adTag });
      return r === null ? upstream() : NextResponse.json({ ok: true });
    }
    const r = await patchUser(PRIMARY_USER, { user_ad_tag: null });
    return r === null ? upstream() : NextResponse.json({ ok: true });
  }

  // The primary link is managed only via the global form/toggle above, so its
  // saved restore-tag can never drift from its live tag.
  if (username === PRIMARY_USER) {
    return badRequest("the main link is managed via the global channel controls");
  }

  // Per-campaign pause/resume — telemt preserves the ad-tag while disabled.
  if (typeof body.enabled === "boolean") {
    const ok = await setUserEnabled(username, body.enabled);
    return ok ? NextResponse.json({ ok }) : upstream();
  }

  // Change or clear the ad-tag.
  if ("adTag" in body) {
    const adTag = normTag(body.adTag);
    if (adTag && !TAG_RE.test(adTag)) {
      return badRequest("ad-tag must be 32 hex characters");
    }
    const r = await patchUser(username, { user_ad_tag: adTag || null });
    return r === null ? upstream() : NextResponse.json({ ok: true });
  }

  return badRequest("nothing to update");
}

export async function DELETE(req: Request) {
  if (!(await isAuthed(req))) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return badRequest("invalid body");
  }

  const username = str(body.username);
  if (!username) return badRequest("username is required");
  if (username === PRIMARY_USER) {
    return badRequest("cannot delete the primary link");
  }

  const ok = await deleteUser(username);
  if (ok) await deleteCampaignMeta(username);
  return ok ? NextResponse.json({ ok }) : upstream();
}
