import { handle, query, unwrap } from "@/lib/api";

// GET /api/admin/stores?status=&q=   (view joins owner + current subscription)
export const GET = handle(async (ctx, req) => {
  const p = query(req);
  let sel = ctx.supabase.from("admin_store_overview").select("*").order("created_at", { ascending: false }).limit(200);
  const st = p.get("status");
  if (st && ["pending", "active", "blocked"].includes(st)) sel = sel.eq("status", st);
  const q = (p.get("q") ?? "").replace(/[%_,()\\*]/g, " ").trim().slice(0, 60);
  if (q) sel = sel.or(`name.ilike.%${q}%,owner_phone.ilike.%${q}%,owner_name.ilike.%${q}%`);
  return unwrap(await sel);
}, { admin: true });
