import { handle, body, unwrap } from "@/lib/api";
import { reasonBody } from "@/lib/schemas";

// POST /api/debts/:id/cancel {reason}  (only if nothing was paid; otherwise void payments first)
export const POST = handle(async (ctx, req, { id }) => {
  const { reason } = await body(req, reasonBody);
  return unwrap(await ctx.supabase.rpc("cancel_debt", { p_debt_id: id, p_reason: reason }));
});
