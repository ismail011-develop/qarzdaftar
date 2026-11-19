import { handle, body, query, unwrap } from "@/lib/api";
import { messageCreate } from "@/lib/schemas";

// GET /api/support/conversations/:id/messages?before=ISO&limit=
export const GET = handle(async (ctx, req, { id }) => {
  const p = query(req);
  let sel = ctx.supabase.from("support_messages").select("*").eq("conversation_id", id)
    .order("created_at", { ascending: false }).limit(Math.min(Number(p.get("limit")) || 50, 100));
  if (p.get("before")) sel = sel.lt("created_at", p.get("before")!);
  return (unwrap(await sel) as unknown[]).reverse();
});

// POST {body?, attachment_*}: sender, role and store are set by a DB trigger, not by the client.
// Upload the file first to bucket "support-attachments" at "<store_id>/<uuid>-<name>".
export const POST = handle(async (ctx, req, { id }) => {
  const i = await body(req, messageCreate);
  return unwrap(await ctx.supabase.from("support_messages").insert({ conversation_id: id, ...i }).select().single());
}, { status: 201 });
