import { handle, query, unwrap } from "@/lib/api";

// GET /api/admin/subscriptions?status=pending|active|expired|rejected&store_id=  (payment review queue)
export const GET = handle(async (ctx, req) => {
  const p = query(req);
  let sel = ctx.supabase.from("subscriptions").select("*, store:stores(id, name), plan:subscription_plans(code, name)")
    .order("submitted_at", { ascending: false }).limit(200);
  if (p.get("status")) sel = sel.eq("status", p.get("status")!);
  if (p.get("store_id")) sel = sel.eq("store_id", p.get("store_id")!);
  return unwrap(await sel);
}, { admin: true });
