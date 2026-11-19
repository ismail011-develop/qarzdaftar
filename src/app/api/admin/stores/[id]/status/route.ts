import { handle, body, unwrap } from "@/lib/api";
import { storeStatusBody } from "@/lib/schemas";

// POST {status: "active"|"blocked", reason?}  -> activate / block / unblock (reason required for block)
export const POST = handle(async (ctx, req, { id }) => {
  const i = await body(req, storeStatusBody);
  return unwrap(await ctx.supabase.rpc("admin_set_store_status", { p_store_id: id, p_status: i.status, p_reason: i.reason ?? null }));
}, { admin: true });
