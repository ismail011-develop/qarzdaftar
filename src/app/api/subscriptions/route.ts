import { handle, body, unwrap, myStoreId } from "@/lib/api";
import { subscriptionRequest } from "@/lib/schemas";

// GET /api/subscriptions -> available plans + my subscription history
export const GET = handle(async (ctx) => {
  const store_id = await myStoreId(ctx);
  const plans = unwrap(await ctx.supabase.from("subscription_plans").select("*").eq("is_active", true).order("sort_order"));
  const subscriptions = unwrap(await ctx.supabase.from("subscriptions").select("*").eq("store_id", store_id).order("created_at", { ascending: false }));
  return { plans, subscriptions };
});

// POST /api/subscriptions {plan_id, reference?, proof_path?}  -> creates a PENDING request for manual admin check
export const POST = handle(async (ctx, req) => {
  const i = await body(req, subscriptionRequest);
  return unwrap(await ctx.supabase.rpc("request_subscription", { p_plan_id: i.plan_id, p_reference: i.reference ?? null, p_proof_path: i.proof_path ?? null }));
}, { status: 201 });
