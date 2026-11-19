import { handle, body, unwrap } from "@/lib/api";
import { planCreate } from "@/lib/schemas";

export const GET = handle(async (ctx) => unwrap(await ctx.supabase.from("subscription_plans").select("*").order("sort_order")), { admin: true });
export const POST = handle(async (ctx, req) => unwrap(await ctx.supabase.from("subscription_plans").insert(await body(req, planCreate)).select().single()), { admin: true, status: 201 });
