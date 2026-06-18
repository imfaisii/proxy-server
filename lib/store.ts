// Module singleton holding the latest derived live snapshot. The background
// poller (instrumentation.ts) is the sole writer; /api/state is the reader.
// This keeps expensive conntrack/metrics work off the request path.
import type { MtgMetrics } from "@/lib/metrics";
import type { HostConn } from "@/lib/conntrack";

export interface LiveSnapshot {
  metrics: MtgMetrics | null;
  conns: HostConn[];
  updatedAt: number;
}

let latest: LiveSnapshot = { metrics: null, conns: [], updatedAt: 0 };

export function getLatest(): LiveSnapshot {
  return latest;
}

export function setLatest(snap: LiveSnapshot): void {
  latest = snap;
}
