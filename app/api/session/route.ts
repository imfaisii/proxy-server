// GET /api/session -> { authed: boolean }.
import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return NextResponse.json({ authed: await isAuthed(req) });
}
