import { handle, body, query, unwrap } from "@/lib/api";
import { debtCreate } from "@/lib/schemas";

// GET /api/debts?status=open|partial|paid|cancelled&customer_id=&overdue=1&limit=
export const GET = handle(async (ctx, req) => {
  const p = query(req);
  let sel = ctx.supabase.from("debts").select("*, customer:customers(id, full_name, phone)").order("due_on").limit(Math.min(Number(p.get("limit")) || 100, 200));
  const status = p.get("status");
  if (status && ["open", "partial", "paid", "cancelled"].includes(status)) sel = sel.eq("status", status);
  if (p.get("customer_id")) sel = sel.eq("customer_id", p.get("customer_id")!);
  if (p.get("overdue") === "1") {
    const today = new Date(Date.now() + 5 * 3600_000).toISOString().slice(0, 10);   // Asia/Tashkent date
    sel = sel.in("status", ["open", "partial"]).lt("due_on", today);
  }
  return unwrap(await sel);
});

// POST /api/debts  -> rpc create_debt (checks subscription + customer ownership)
export const POST = handle(async (ctx, req) => {
  const i = await body(req, debtCreate);
  return unwrap(await ctx.supabase.rpc("create_debt", {
    p_customer_id: i.customer_id, p_amount: i.amount, p_due_on: i.due_on,
    p_comment: i.comment ?? null, p_issued_on: i.issued_on ?? null,
  }));
}, { status: 201 });
