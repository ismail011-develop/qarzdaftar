import { handle, unwrap } from "@/lib/api";

// POST -> admin or the store owner closes the ticket
export const POST = handle(async (ctx, _req, { id }) => unwrap(await ctx.supabase.rpc("close_conversation", { p_id: id })));
