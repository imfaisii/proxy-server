// Next.js instrumentation hook. Runs in every runtime, so the actual poller —
// which needs Node-only modules (conntrack, pg) — lives in instrumentation.node.ts
// and is imported ONLY under the Node runtime. This keeps node:child_process and
// pg out of the Edge instrumentation bundle.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation.node");
  }
}
