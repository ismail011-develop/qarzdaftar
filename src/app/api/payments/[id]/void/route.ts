import { handle, body, unwrap } from "@/lib/api";
import { reasonBody } from "@/lib/schemas";

// POST /api/payments/:id/void {reason}  -> correction without deleting history
export const POST = handle(async (ctx, req, { id }) => {
  const { reason } = await body(req, reasonBody);
  return unwrap(await ctx.supabase.rpc("void_payment", { p_payment_id: id, p_reason: reason }));
});
