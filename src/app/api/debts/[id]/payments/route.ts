import { handle, body, unwrap } from "@/lib/api";
import { paymentCreate } from "@/lib/schemas";

// POST /api/debts/:id/payments {amount, paid_on?, method?, note?, idempotency_key?}
// Send a fresh idempotency_key (uuid) per form submit: retries never double-charge.
export const POST = handle(async (ctx, req, { id }) => {
  const i = await body(req, paymentCreate);
  return unwrap(await ctx.supabase.rpc("record_payment", {
    p_debt_id: id, p_amount: i.amount, p_paid_on: i.paid_on ?? null, p_method: i.method,
    p_note: i.note ?? null, p_idempotency_key: i.idempotency_key ?? null,
  }));
}, { status: 201 });
