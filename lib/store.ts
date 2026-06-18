// Latest derived live snapshot. The background poller (instrumentation) writes
// it; /api/state reads it. Stored on globalThis because Next bundles the
// instrumentation hook and the route handlers separately — a plain module-level
// variable would give each bundle its OWN copy, so the reader would never see
// the writer's updates. globalThis is shared across bundles in the one process.
import type { MtgMetrics } from "@/lib/metrics";
import type { HostConn } from "@/lib/conntrack";

export interface LiveSnapshot {
  metrics: MtgMetrics | null;
  conns: HostConn[];
  updatedAt: number;
}

const g = globalThis as typeof globalThis & { __mtpLatest?: LiveSnapshot };
if (!g.__mtpLatest) {
  g.__mtpLatest = { metrics: null, conns: [], updatedAt: 0 };
}

export function getLatest(): LiveSnapshot {
  return g.__mtpLatest!;
}

export function setLatest(snap: LiveSnapshot): void {
  g.__mtpLatest = snap;
}
