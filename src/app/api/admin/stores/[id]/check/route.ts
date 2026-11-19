import { handle, unwrap } from "@/lib/api";

// GET -> "Check": status, subscription, days left, last payment, block state, admin action history
export const GET = handle(async (ctx, _req, { id }) => unwrap(await ctx.supabase.rpc("admin_check_store", { p_store_id: id })), { admin: true });
