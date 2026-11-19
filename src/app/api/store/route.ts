import { z } from "zod";
import { handle, body, unwrap, HttpError } from "@/lib/api";
import { registerBody } from "@/lib/schemas";

// GET /api/store -> my store + subscription state (drives the "expired / blocked" banner)
export const GET = handle(async (ctx) => {
  const store = unwrap(await ctx.supabase.from("stores").select("*").eq("owner_id", ctx.user.id).maybeSingle());
  if (!store) throw new HttpError(404, "store_not_found");
  const { data: sub } = await ctx.supabase.from("subscriptions").select("id, ends_at, status")
    .eq("store_id", (store as { id: string }).id).eq("status", "active").gt("ends_at", new Date().toISOString())
    .order("ends_at", { ascending: false }).limit(1).maybeSingle();
  return { store, subscription: sub ?? null, subscription_active: !!sub };
});

// POST /api/store {name, city?, address?} -> call right after sign-up
export const POST = handle(async (ctx, req) => {
  const i = await body(req, registerBody);
  return unwrap(await ctx.supabase.rpc("register_store", { p_name: i.name, p_city: i.city ?? null, p_address: i.address ?? null }));
}, { status: 201 });

// PATCH /api/store {name?, city?, address?}  (status / owner are not writable)
export const PATCH = handle(async (ctx, req) => {
  const i = await body(req, registerBody.partial().strict().or(z.object({}).strict()));
  const row = unwrap(await ctx.supabase.from("stores").update(i).eq("owner_id", ctx.user.id).select().maybeSingle());
  if (!row) throw new HttpError(404, "store_not_found");
  return row;
});
