import { handle, body, unwrap } from "@/lib/api";
import { reasonBody } from "@/lib/schemas";

export const POST = handle(async (ctx, req, { id }) => {
  const { reason } = await body(req, reasonBody);
  return unwrap(await ctx.supabase.rpc("admin_reject_subscription", { p_subscription_id: id, p_reason: reason }));
}, { admin: true });
