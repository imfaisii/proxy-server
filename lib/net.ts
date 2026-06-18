// Resolve the server's public IPv4 for display (Settings, tg:// link).
// Priority: explicit SERVER_IP env > detected public IP (cached) > seed fallback.
import { CONFIG } from "@/lib/env";
import { SERVER } from "@/lib/data";

const g = globalThis as typeof globalThis & { __mtpPublicIp?: string };

export async function getServerIp(): Promise<string> {
  if (CONFIG.SERVER_IP) return CONFIG.SERVER_IP;
  if (g.__mtpPublicIp) return g.__mtpPublicIp;
  try {
    const res = await fetch("https://api.ipify.org", {
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const ip = (await res.text()).trim();
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
        g.__mtpPublicIp = ip;
        return ip;
      }
    }
  } catch {
    /* offline or blocked — fall back to the seed value */
  }
  return SERVER.ip;
}
