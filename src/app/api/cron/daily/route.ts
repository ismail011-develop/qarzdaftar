import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return given.length === want.length && timingSafeEqual(given, want);
}

// Daily job: due/overdue reminders + subscription expiry. Called by Vercel Cron (vercel.json) or any scheduler.
export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: { code: "forbidden" } }, { status: 403 });
  const db = createServiceClient();
  const expired = await db.rpc("expire_subscriptions");
  const due = await db.rpc("generate_due_notifications");
  if (expired.error || due.error) return NextResponse.json({ error: { code: "job_failed" } }, { status: 500 });
  return NextResponse.json({ data: { subscription_notifications: expired.data, debt_notifications: due.data } });
}
