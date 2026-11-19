import { handle, body, query, unwrap } from "@/lib/api";
import { notificationsRead } from "@/lib/schemas";

// GET /api/notifications?unread=1
export const GET = handle(async (ctx, req) => {
  let sel = ctx.supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
  if (query(req).get("unread") === "1") sel = sel.is("read_at", null);
  return unwrap(await sel);
});

// PATCH {ids?} -> mark some (or all) as read; only read_at is writable
export const PATCH = handle(async (ctx, req) => {
  const { ids } = await body(req, notificationsRead);
  let upd = ctx.supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  if (ids?.length) upd = upd.in("id", ids);
  const rows = unwrap(await upd.select("id")) as unknown[];
  return { marked: rows.length };
});
