import { handle, unwrap } from "@/lib/api";

// POST -> marks the other side's messages as read (read receipts), returns how many
export const POST = handle(async (ctx, _req, { id }) => ({ marked: unwrap(await ctx.supabase.rpc("mark_conversation_read", { p_id: id })) }));
