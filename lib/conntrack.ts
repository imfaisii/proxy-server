// Reads the host conntrack table to enumerate live TCP flows to the proxy port.
// PRIVACY: results are live-only and MUST NEVER be persisted (callers recompute
// each request). Returns [] when collection is disabled or conntrack is missing.
import { execFile } from "node:child_process";
import { CONFIG } from "@/lib/env";

export interface HostConn {
  ip: string;
  sinceSecs: number;
  down: number;
  up: number;
}

let warned = false;
function warnOnce(msg: string, err?: unknown) {
  if (warned) return;
  warned = true;
  console.warn(msg, err ?? "");
}

function run(): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(
      "conntrack",
      ["-L", "-p", "tcp", "-o", "timestamp"],
      { maxBuffer: 32 * 1024 * 1024, timeout: 2500 },
      (err, stdout) => {
        if (err) {
          warnOnce("[conntrack] unavailable (binary missing or no permission)", err);
          resolve(null);
          return;
        }
        resolve(stdout);
      },
    );
  });
}

const PORT = String(CONFIG.MTG_PORT);

// A real client is a remote, public peer. Exclude private/loopback/link-local
// addresses and the server's own IP so we don't count the proxy's OUTBOUND
// connections to Telegram (mtg -> DC :443) or docker-internal flows as clients.
function isLocalOrServer(ip: string): boolean {
  if (CONFIG.SERVER_IP && ip === CONFIG.SERVER_IP) return true;
  if (ip.startsWith("127.") || ip === "::1" || ip.startsWith("fe80:")) return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true; // IPv6 ULA
  // 172.16.0.0 – 172.31.255.255 (covers docker bridge networks)
  const m = ip.match(/^172\.(\d+)\./);
  if (m) {
    const second = Number(m[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

// Each conntrack line looks roughly like:
// [1700000000.123456] tcp 6 431999 ESTABLISHED src=1.2.3.4 dst=10.0.0.1 \
//   sport=51000 dport=443 [bytes=1234] dst=10.0.0.1 src=1.2.3.4 sport=443 \
//   dport=51000 [bytes=5678] [ASSURED] [start=...]
// The first src/dst block is the ORIGINAL direction; with acct enabled there
// are two `bytes=` fields (original then reply).
function parseLine(line: string): HostConn | null {
  // Only count live client sessions, not handshakes/teardown (TIME_WAIT, etc.).
  if (!line.includes("ESTABLISHED")) return null;
  if (!line.includes("dport=" + PORT) && !line.includes("sport=" + PORT)) {
    return null;
  }

  const srcMatches = [...line.matchAll(/\bsrc=([0-9a-fA-F:.]+)/g)].map((m) => m[1]);
  const dportMatches = [...line.matchAll(/\bdport=(\d+)/g)].map((m) => m[1]);
  const sportMatches = [...line.matchAll(/\bsport=(\d+)/g)].map((m) => m[1]);
  const bytesMatches = [...line.matchAll(/\bbytes=(\d+)/g)].map((m) => Number(m[1]));

  if (srcMatches.length === 0) return null;

  // The client is the src of the ORIGINAL direction: the original tuple's
  // dport is the proxy port (client -> server). Fall back to first src.
  let clientIp = srcMatches[0];
  if (dportMatches[0] !== PORT && sportMatches[0] === PORT && srcMatches[1]) {
    // Original direction reversed in output ordering; client is the other src.
    clientIp = srcMatches[1];
  }

  // Drop the proxy's own outbound flows to Telegram and any docker-internal
  // traffic: a genuine client is a remote, public peer.
  if (isLocalOrServer(clientIp)) return null;

  // Original bytes ~ client->server (up); reply bytes ~ server->client (down).
  const up = bytesMatches.length > 0 ? bytesMatches[0] : 0;
  const down = bytesMatches.length > 1 ? bytesMatches[1] : 0;

  // [start=EPOCH] timestamp gives flow age when -o timestamp is supported.
  let sinceSecs = 0;
  const startMatch = line.match(/\bstart=(\d+)/);
  if (startMatch) {
    const start = Number(startMatch[1]);
    if (Number.isFinite(start) && start > 0) {
      sinceSecs = Math.max(0, Math.floor(Date.now() / 1000) - start);
    }
  }

  return { ip: clientIp, sinceSecs, down, up };
}

export async function listConnections(): Promise<HostConn[]> {
  if (!CONFIG.COLLECT_CONNECTIONS) return [];
  try {
    const out = await run();
    if (!out) return [];
    const conns: HostConn[] = [];
    for (const line of out.split("\n")) {
      if (!line.trim()) continue;
      const c = parseLine(line);
      if (c) conns.push(c);
    }
    return conns;
  } catch (err) {
    warnOnce("[conntrack] failed to list connections", err);
    return [];
  }
}
