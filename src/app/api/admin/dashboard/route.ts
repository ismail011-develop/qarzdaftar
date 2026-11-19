import { handle, unwrap } from "@/lib/api";

export const GET = handle(async (ctx) => unwrap(await ctx.supabase.rpc("admin_dashboard_stats")), { admin: true });
