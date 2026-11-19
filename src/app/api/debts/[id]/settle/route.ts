import { handle, body, unwrap } from "@/lib/api";
import { settleBody } from "@/lib/schemas";

// POST /api/debts/:id/settle  -> pays the exact remaining amount (full close)
export const POST = handle(async (ctx, req, { id }) => {
  const i = await body(req, settleBody);
  return unwrap(await ctx.supabase.rpc("settle_debt", { p_debt_id: id, p_paid_on: i.paid_on ?? null, p_note: i.note ?? null }));
}, { status: 201 });
