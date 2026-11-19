import { handle, body, unwrap } from "@/lib/api";
import { grantBody } from "@/lib/schemas";

// POST {store_id, plan_id, price_uzs?, note?} -> connect / renew / change plan manually
export const POST = handle(async (ctx, req) => {
  const i = await body(req, grantBody);
  return unwrap(await ctx.supabase.rpc("admin_grant_subscription", { p_store_id: i.store_id, p_plan_id: i.plan_id, p_price: i.price_uzs ?? null, p_note: i.note ?? null }));
}, { admin: true, status: 201 });
