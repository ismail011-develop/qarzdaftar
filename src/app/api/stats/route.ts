import { handle, query, unwrap } from "@/lib/api";

// GET /api/stats?from=YYYY-MM-DD&to=YYYY-MM-DD  (period presets are computed by the client: day/week/month/year)
export const GET = handle(async (ctx, req) => {
  const p = query(req);
  return unwrap(await ctx.supabase.rpc("get_store_stats", { p_from: p.get("from"), p_to: p.get("to") }));
});
