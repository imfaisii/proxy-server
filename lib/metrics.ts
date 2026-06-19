// Reads the telemt Prometheus metrics endpoint (:9090/metrics) and maps it to
// the small set of numbers the console cares about. Tolerates missing series and
// never throws. Matching is substring-based so it survives minor naming
// differences and also still parses mtg-style names.
//
// telemt per-user series: telemt_user_connections_current (gauge) and
// telemt_user_octets_to_client / telemt_user_octets_from_client (counters;
// direction is in the NAME, not a label). Confirm names by curling the live
// endpoint (`curl http://127.0.0.1:9090/metrics`). fetchProxyMetrics prefers the
// REST API for the active count and falls back to it for byte totals.
import { CONFIG } from "@/lib/env";

export interface MtgMetrics {
  activeConnections: number;
  totalDown: number;
  totalUp: number;
  rateDown: number;
  rateUp: number;
  replayAttacks: number;
  // Which source produced the byte totals, so the poller can avoid computing a
  // bogus rate across a source switch (the two sources count bytes differently).
  source?: "prom" | "api";
}

export interface PromSample {
  name: string;
  labels: Record<string, string>;
  value: number;
}

const warned = new Set<string>();
function warnOnce(msg: string, err?: unknown) {
  if (warned.has(msg)) return;
  warned.add(msg);
  console.warn(msg, err ?? "");
}

// Minimal Prometheus text-format parser. Ignores HELP/TYPE comment lines.
export function parsePrometheus(text: string): PromSample[] {
  const out: PromSample[] = [];
  const lines = text.split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    // Format: metric_name{label="v",...} value [timestamp]
    let name = "";
    let labels: Record<string, string> = {};
    let rest = line;

    const brace = line.indexOf("{");
    if (brace !== -1) {
      name = line.slice(0, brace).trim();
      const close = line.indexOf("}", brace);
      if (close === -1) continue;
      const labelStr = line.slice(brace + 1, close);
      labels = parseLabels(labelStr);
      rest = line.slice(close + 1).trim();
    } else {
      const sp = line.indexOf(" ");
      if (sp === -1) continue;
      name = line.slice(0, sp).trim();
      rest = line.slice(sp + 1).trim();
    }

    const valStr = rest.split(/\s+/)[0];
    const value = Number(valStr);
    if (!name || !Number.isFinite(value)) continue;
    out.push({ name, labels, value });
  }
  return out;
}

function parseLabels(s: string): Record<string, string> {
  const labels: Record<string, string> = {};
  // Matches key="value" pairs, tolerating escaped quotes inside the value.
  const re = /([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*"((?:[^"\\]|\\.)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    labels[m[1]] = m[2].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return labels;
}

function isDownLabel(labels: Record<string, string>): boolean {
  const vals = Object.values(labels).map((v) => v.toLowerCase());
  const joined = vals.join(" ");
  // Explicit direction-ish hints first.
  if (joined.includes("to_client") || joined.includes("from_telegram")) return true;
  if (joined.includes("from_client") || joined.includes("to_telegram")) return false;
  // Generic "direction"/"dir" label. telemt-style values: down/up, rx/tx,
  // download/upload, egress/ingress. client-bound => down.
  const dir = (labels.direction || labels.dir || "").toLowerCase();
  if (dir) {
    if (dir.includes("down") || dir.includes("rx") || dir.includes("egress")) return true;
    if (dir.includes("up") || dir.includes("tx") || dir.includes("ingress")) return false;
    return dir.includes("client") && !dir.includes("from_client");
  }
  // Fallback: anything mentioning "client" treated as down.
  return joined.includes("client");
}

function mapMetrics(samples: PromSample[]): MtgMetrics {
  let activeConnections = 0;
  let activeFallback = 0;
  let replayAttacks = 0;

  // Track client-side and telegram-side traffic separately. Every byte passes
  // through both sides, so summing both would double-count — prefer the
  // client-side totals (what users actually transferred) and only fall back to
  // the telegram side when no client_traffic series exists.
  let clientDown = 0;
  let clientUp = 0;
  let otherDown = 0;
  let otherUp = 0;

  for (const s of samples) {
    const n = s.name.toLowerCase();

    // telemt: telemt_user_connections_current{user} (gauge, summed over users).
    // mtg: *client_connections* / *telegram_connections*. (NOT *_connections_total,
    // which is cumulative, not "active".)
    if (n.includes("connections_current") || n.includes("client_connections")) {
      activeConnections += s.value;
    } else if (n.includes("telegram_connections")) {
      activeFallback += s.value;
    }

    // telemt user traffic is telemt_user_octets_{to,from}_client — direction is
    // in the NAME. Match "octets"/"traffic" only, NOT "bytes": telemt's internal
    // counters (telemt_me_*_bytes_total, quota_refund_bytes_total, rate_limiter_*)
    // contain "bytes" and would be mislabeled as traffic.
    if (n.includes("octets") || n.includes("traffic")) {
      const down = n.includes("to_client")
        ? true
        : n.includes("from_client")
          ? false
          : isDownLabel(s.labels);
      if (n.includes("client")) {
        if (down) clientDown += s.value;
        else clientUp += s.value;
      } else {
        if (down) otherDown += s.value;
        else otherUp += s.value;
      }
    }

    if (n.includes("replay")) {
      replayAttacks += s.value;
    }
  }

  if (activeConnections === 0 && activeFallback > 0) {
    activeConnections = activeFallback;
  }

  const hasClient = clientDown > 0 || clientUp > 0;
  const totalDown = hasClient ? clientDown : otherDown;
  const totalUp = hasClient ? clientUp : otherUp;

  return {
    activeConnections,
    totalDown,
    totalUp,
    rateDown: 0, // derived by the poller from deltas
    rateUp: 0,
    replayAttacks,
  };
}

// Preferred entry point. Active connections come from telemt's REST API
// (current_connections — reliable and correctly "active"); the byte down/up
// split comes from Prometheus octets when present, else the REST total (a single
// cumulative number shown as downloaded). Returns null only when both are down.
export async function fetchProxyMetrics(): Promise<MtgMetrics | null> {
  const { apiMetrics } = await import("@/lib/telemt");
  const [prom, api] = await Promise.all([fetchMtgMetrics(), apiMetrics()]);
  if (!prom && !api) return null;

  // Show unique devices (active_unique_ips), not raw TCP sockets — a single
  // Telegram client opens several connections, which otherwise reads as "2+".
  const activeConnections = api ? api.devices : prom?.activeConnections ?? 0;

  const promSplit = !!prom && (prom.totalDown > 0 || prom.totalUp > 0);
  const totalDown = promSplit ? prom!.totalDown : api ? api.totalOctets : prom?.totalDown ?? 0;
  const totalUp = promSplit ? prom!.totalUp : 0;

  return {
    activeConnections,
    totalDown,
    totalUp,
    rateDown: 0,
    rateUp: 0,
    replayAttacks: prom?.replayAttacks ?? 0,
    source: promSplit ? "prom" : "api",
  };
}

export async function fetchMtgMetrics(): Promise<MtgMetrics | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(CONFIG.MTG_METRICS_URL, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      warnOnce(`[metrics] mtg metrics returned HTTP ${res.status}`);
      return null;
    }
    const text = await res.text();
    return mapMetrics(parsePrometheus(text));
  } catch (err) {
    warnOnce(`[metrics] could not reach mtg metrics at ${CONFIG.MTG_METRICS_URL}`, err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
