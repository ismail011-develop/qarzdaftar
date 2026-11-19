import { handle, body, unwrap, HttpError } from "@/lib/api";
import { debtPatch } from "@/lib/schemas";

export const GET = handle(async (ctx, _req, { id }) => {
  const debt = unwrap(await ctx.supabase.from("debts").select("*, customer:customers(id, full_name, phone)").eq("id", id).maybeSingle());
  if (!debt) throw new HttpError(404, "debt_not_found");
  const payments = unwrap(await ctx.supabase.from("payments").select("*").eq("debt_id", id).order("created_at", { ascending: false }));
  return { debt, payments };
});

// PATCH -> rpc update_debt (amount can never drop below what is already paid)
export const PATCH = handle(async (ctx, req, { id }) => {
  const i = await body(req, debtPatch);
  return unwrap(await ctx.supabase.rpc("update_debt", {
    p_debt_id: id, p_amount: i.amount ?? null, p_due_on: i.due_on ?? null, p_comment: i.comment ?? null,
  }));
});
