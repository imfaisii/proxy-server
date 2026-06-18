// GET /api/campaigns  -> Campaign[] (DB-backed, else seeded demo)
// POST /api/campaigns -> create a campaign { name, channel }
// Both are auth-gated.
import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { listCampaigns, saveCampaign } from "@/lib/db";
import { getCampaigns } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const campaigns = (await listCampaigns()) ?? getCampaigns();
  return NextResponse.json(campaigns);
}

export async function POST(req: Request) {
  if (!(await isAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let name = "";
  let channel = "";
  try {
    const body = (await req.json()) as { name?: unknown; channel?: unknown };
    name = typeof body.name === "string" ? body.name.trim() : "";
    channel = typeof body.channel === "string" ? body.channel.trim() : "";
  } catch {
    /* invalid body handled below */
  }

  if (!name || !channel) {
    return NextResponse.json(
      { error: "name and channel are required" },
      { status: 400 },
    );
  }

  await saveCampaign({ name, channel, status: "Active" });
  return NextResponse.json({ ok: true });
}
