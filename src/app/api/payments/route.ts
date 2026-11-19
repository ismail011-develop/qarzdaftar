import { handle, query, unwrap } from "@/lib/api";

// GET /api/payments?debt_id=&status=confirmed|voided&limit=   (full ledger incl. voided rows)
export const GET = handle(async (ctx, req) => {
  const p = query(req);
  let sel = ctx.supabase.from("payments").select("*, debt:debts(id, customer:customers(id, full_name))")
    .order("created_at", { ascending: false }).limit(Math.min(Number(p.get("limit")) || 100, 200));
  if (p.get("debt_id")) sel = sel.eq("debt_id", p.get("debt_id")!);
  const st = p.get("status");
  if (st === "confirmed" || st === "voided") sel = sel.eq("status", st);
  return unwrap(await sel);
});
