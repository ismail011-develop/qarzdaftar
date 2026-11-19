import { handle, unwrap } from "@/lib/api";

// POST -> manual payment confirmation: activates (or extends) the subscription
export const POST = handle(async (ctx, _req, { id }) => unwrap(await ctx.supabase.rpc("admin_confirm_subscription", { p_subscription_id: id })), { admin: true });
