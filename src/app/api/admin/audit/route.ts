import { handle, query, unwrap } from "@/lib/api";

// GET /api/admin/audit?store_id=&entity_type=&actor_id=&limit=
export const GET = handle(async (ctx, req) => {
  const p = query(req);
  let sel = ctx.supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(Math.min(Number(p.get("limit")) || 100, 500));
  for (const k of ["store_id", "entity_type", "actor_id"]) if (p.get(k)) sel = sel.eq(k, p.get(k)!);
  return unwrap(await sel);
}, { admin: true });
