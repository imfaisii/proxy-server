// Session auth via a stateless HMAC token in an httpOnly cookie.
// The token is HMAC-SHA256 over a fixed marker + the admin password, keyed by
// SESSION_SECRET. Because the password is part of the signed payload, changing
// the admin password automatically invalidates every existing session.
import { createHmac, timingSafeEqual } from "node:crypto";
import { CONFIG } from "@/lib/env";

export const COOKIE_NAME = "mtp_session";

const MARKER = "mtproxy-console-session-v1";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function token(): string {
  return createHmac("sha256", CONFIG.SESSION_SECRET)
    .update(MARKER + ":" + CONFIG.ADMIN_PASSWORD)
    .digest("hex");
}

const isDev = process.env.NODE_ENV !== "production";

export function createSessionCookie(): string {
  const attrs = [
    `${COOKIE_NAME}=${token()}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${MAX_AGE}`,
  ];
  if (!isDev) attrs.push("Secure");
  return attrs.join("; ");
}

export function clearSessionCookie(): string {
  const attrs = [
    `${COOKIE_NAME}=`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=0",
  ];
  if (!isDev) attrs.push("Secure");
  return attrs.join("; ");
}

export function checkPassword(pw: string): boolean {
  const a = Buffer.from(String(pw));
  const b = Buffer.from(CONFIG.ADMIN_PASSWORD);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return part.slice(eq + 1).trim();
    }
  }
  return null;
}

export async function isAuthed(req: Request): Promise<boolean> {
  const got = readCookie(req, COOKIE_NAME);
  if (!got) return false;
  const want = token();
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
