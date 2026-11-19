import { handle, body, query, unwrap } from "@/lib/api";
import { conversationCreate } from "@/lib/schemas";

// GET /api/support/conversations?status=open|closed  (owner: own store; admin: all stores)
export const GET = handle(async (ctx, req) => {
  const st = query(req).get("status");
  let sel = ctx.supabase.from("support_conversations").select("*, store:stores(id, name)").order("last_message_at", { ascending: false }).limit(100);
  if (st === "open" || st === "closed") sel = sel.eq("status", st);
  return unwrap(await sel);
});

// POST /api/support/conversations {subject, body}  (owner opens a ticket)
export const POST = handle(async (ctx, req) => {
  const i = await body(req, conversationCreate);
  return unwrap(await ctx.supabase.rpc("open_conversation", { p_subject: i.subject, p_body: i.body }));
}, { status: 201 });
