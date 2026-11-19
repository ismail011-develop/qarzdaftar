import { handle, body, query, unwrap, myStoreId } from "@/lib/api";
import { customerCreate } from "@/lib/schemas";

// GET /api/customers?q=  -> balances per customer (search by name or phone)
export const GET = handle(async (ctx, req) => {
  const q = (query(req).get("q") ?? "").replace(/[%_,()\\*]/g, " ").trim().slice(0, 60);
  let sel = ctx.supabase.from("customer_balances").select("*").order("full_name").limit(200);
  if (q) sel = sel.or(`full_name.ilike.%${q}%,phone.ilike.%${q.replace(/\s/g, "")}%`);
  return unwrap(await sel);
});

// POST /api/customers
export const POST = handle(async (ctx, req) => {
  const input = await body(req, customerCreate);
  const store_id = await myStoreId(ctx);
  return unwrap(await ctx.supabase.from("customers").insert({ ...input, store_id }).select().single());
}, { status: 201 });
