import { handle, body, unwrap, HttpError } from "@/lib/api";
import { planPatch } from "@/lib/schemas";

// PATCH -> change price / duration / active flag. Existing subscriptions keep their price snapshot.
export const PATCH = handle(async (ctx, req, { id }) => {
  const row = unwrap(await ctx.supabase.from("subscription_plans").update(await body(req, planPatch)).eq("id", id).select().maybeSingle());
  if (!row) throw new HttpError(404, "plan_not_found");
  return row;
}, { admin: true });
