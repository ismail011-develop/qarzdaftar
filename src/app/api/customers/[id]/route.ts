import { handle, body, unwrap, HttpError } from "@/lib/api";
import { customerPatch } from "@/lib/schemas";

export const GET = handle(async (ctx, _req, { id }) => {
  const customer = unwrap(await ctx.supabase.from("customer_balances").select("*").eq("customer_id", id).maybeSingle());
  if (!customer) throw new HttpError(404, "customer_not_found");
  const debts = unwrap(await ctx.supabase.from("debts").select("*").eq("customer_id", id).order("created_at", { ascending: false })) as { id: string }[];
  const payments = debts.length
    ? unwrap(await ctx.supabase.from("payments").select("*").in("debt_id", debts.map((d) => d.id)).order("created_at", { ascending: false }))
    : [];
  return { customer, debts, payments };
});

export const PATCH = handle(async (ctx, req, { id }) => {
  const input = await body(req, customerPatch);
  const row = unwrap(await ctx.supabase.from("customers").update(input).eq("id", id).is("deleted_at", null).select().maybeSingle());
  if (!row) throw new HttpError(404, "customer_not_found");
  return row;
});

// DELETE = soft delete (rejected by the DB while the customer still has open debts)
export const DELETE = handle(async (ctx, _req, { id }) => {
  const row = unwrap(await ctx.supabase.from("customers").update({ deleted_at: new Date().toISOString() }).eq("id", id).is("deleted_at", null).select("id").maybeSingle());
  if (!row) throw new HttpError(404, "customer_not_found");
  return { id, deleted: true };
});
