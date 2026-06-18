// Reads the mtg v2 Prometheus metrics endpoint and maps it to the small set of
// numbers the console cares about. Tolerates missing series and never throws.
//
// NOTE: exact mtg metric names can be confirmed by curling the live endpoint
// (e.g. `curl http://127.0.0.1:3129/metrics`). The mapping below matches on
// substrings of the metric name so it survives minor naming differences.
import { CONFIG } from "@/lib/env";

export interface MtgMetrics {
  activeConnections: number;
  totalDown: number;
  totalUp: number;
  rateDown: number;
  rateUp: number;
  replayAttacks: number;
}

export interface PromSample {
  name: string;
  labels: Record<string, string>;
  value: number;
}

let warned = false;
function warnOnce(msg: string, err?: unknown) {
  if (warned) return;
  warned = true;
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
  // Generic "direction" label: client-bound => down.
  const dir = (labels.direction || labels.dir || "").toLowerCase();
  if (dir) return dir.includes("client") && !dir.includes("from_client");
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

    if (n.includes("client_connections")) {
      activeConnections += s.value;
    } else if (n.includes("telegram_connections")) {
      activeFallback += s.value;
    }

    if (n.includes("traffic")) {
      const down = isDownLabel(s.labels);
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
