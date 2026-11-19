import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type Ctx = { supabase: SupabaseClient; user: User };

/** HTTP status for the machine-readable error codes raised by the SQL functions. */
const DB_ERRORS: Record<string, number> = {
  not_authenticated: 401, forbidden: 403, store_blocked: 403,
  subscription_inactive_or_store_blocked: 402,
  store_not_found: 404, customer_not_found: 404, debt_not_found: 404, payment_not_found: 404,
  conversation_not_found: 404, subscription_not_found: 404, plan_not_found: 404,
  invalid_amount: 422, overpayment: 422, amount_below_paid: 422, future_date: 422,
  reason_required: 422, invalid_attachment_path: 422,
  debt_has_payments: 409, debt_cancelled: 409, already_voided: 409, already_paid: 409,
  store_already_exists: 409, pending_request_exists: 409, conversation_closed: 409,
  invalid_state: 409, customer_has_open_debts: 409, payment_immutable: 409, immutable_record: 409,
};

export class HttpError extends Error {
  constructor(public status: number, public code: string, message?: string) { super(message ?? code); }
}

export const fail = (status: number, code: string, message?: string, details?: unknown) =>
  NextResponse.json({ error: { code, message: message ?? code, details } }, { status });

export function toResponse(e: unknown): NextResponse {
  if (e instanceof HttpError) return fail(e.status, e.code, e.message);
  if (e instanceof ZodError) return fail(422, "validation_error", "Invalid input", e.flatten());
  const pg = e as { message?: string; code?: string };
  if (pg && typeof pg.message === "string") {
    const known = DB_ERRORS[pg.message.trim()];
    if (known) return fail(known, pg.message.trim());
    if (pg.code === "42501") return fail(403, "forbidden");           // RLS / privilege
    if (pg.code === "23505") return fail(409, "duplicate");
    if (pg.code === "23503") return fail(409, "reference_conflict");
    if (pg.code === "23514") return fail(422, "constraint_violation");
    if (pg.code === "22P02") return fail(422, "invalid_input");
  }
  console.error("[api] unexpected error", e);                         // details stay in server logs
  return fail(500, "internal_error");
}

type Opts = { admin?: boolean; status?: number };
type Params = Record<string, string>;

/** Wrap a route: session -> (admin check) -> handler -> uniform JSON. Handlers use the USER's client, so RLS applies. */
export function handle(fn: (ctx: Ctx, req: Request, params: Params) => Promise<unknown>, opts: Opts = {}) {
  return async (req: Request, route: { params: Promise<Params> }) => {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new HttpError(401, "not_authenticated");
      if (opts.admin) {
        const { data } = await supabase.rpc("is_admin");
        if (data !== true) throw new HttpError(403, "forbidden");
      }
      const params = route?.params ? await route.params : {};
      const data = await fn({ supabase, user }, req, params);
      return NextResponse.json({ data }, { status: opts.status ?? 200 });
    } catch (e) {
      return toResponse(e);
    }
  };
}

export async function body<S extends ZodTypeAny>(req: Request, schema: S): Promise<z.infer<S>> {
  let json: unknown;
  try { json = await req.json(); } catch { throw new HttpError(400, "invalid_json"); }
  return schema.parse(json);
}

export function query(req: Request) { return new URL(req.url).searchParams; }

/** Throw the PostgREST error so toResponse() can map it. */
export function unwrap<T>(res: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (res.error) throw res.error;
  return res.data as T;
}

export async function myStoreId(ctx: Ctx): Promise<string> {
  const s = unwrap(await ctx.supabase.from("stores").select("id").eq("owner_id", ctx.user.id).maybeSingle());
  if (!s) throw new HttpError(404, "store_not_found");
  return (s as { id: string }).id;
}
