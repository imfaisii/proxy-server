// Node-runtime-only poller. Isolated in its own module (loaded exclusively via a
// `NEXT_RUNTIME === "nodejs"` dynamic import in instrumentation.ts) so its
// Node-only dependencies (node:child_process via conntrack, pg via db) are never
// pulled into the Edge instrumentation bundle.
//
// Samples mtg metrics + host conntrack on CONFIG.POLL_INTERVAL_MS, derives Mbps
// rates from byte deltas, publishes the snapshot to the in-memory store for
// /api/state to read, and records the AGGREGATE metrics to Postgres.
//
// PRIVACY: conntrack results live only in the in-memory store (recomputed each
// poll); they are NEVER passed to recordMetrics or otherwise persisted.
import { CONFIG } from "@/lib/env";
import { fetchMtgMetrics } from "@/lib/metrics";
import { listConnections } from "@/lib/conntrack";
import { setLatest } from "@/lib/store";
import { ensureSchema, recordMetrics } from "@/lib/db";

const g = globalThis as typeof globalThis & { __mtpPollerStarted?: boolean };

if (!g.__mtpPollerStarted) {
  g.__mtpPollerStarted = true;
  void start();
}

async function start() {
  // Retry: Postgres may still be accepting-connections-but-not-ready right after boot.
  for (let i = 0; i < 10; i++) {
    try {
      await ensureSchema();
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  let running = false;
  let prev: { totalDown: number; totalUp: number; at: number } | null = null;

  async function tick() {
    if (running) return; // guard against overlapping runs
    running = true;
    try {
      const [metrics, conns] = await Promise.all([
        fetchMtgMetrics(),
        listConnections(),
      ]);

      let enriched = metrics;
      if (metrics) {
        const now = Date.now();
        if (prev) {
          const secs = (now - prev.at) / 1000;
          if (secs > 0) {
            const dDown = metrics.totalDown - prev.totalDown;
            const dUp = metrics.totalUp - prev.totalUp;
            // bytes -> Mbps; clamp negatives (counter resets / restarts).
            const rateDown = dDown > 0 ? (dDown * 8) / 1e6 / secs : 0;
            const rateUp = dUp > 0 ? (dUp * 8) / 1e6 / secs : 0;
            enriched = { ...metrics, rateDown, rateUp };
          }
        }
        prev = { totalDown: metrics.totalDown, totalUp: metrics.totalUp, at: now };
      }

      setLatest({ metrics: enriched, conns, updatedAt: Date.now() });

      if (enriched) {
        await recordMetrics(enriched);
      }
    } catch {
      /* never throw out of the poller */
    } finally {
      running = false;
    }
  }

  // Prime once immediately so the first /api/state has data, then poll.
  void tick();
  setInterval(tick, CONFIG.POLL_INTERVAL_MS);
}
