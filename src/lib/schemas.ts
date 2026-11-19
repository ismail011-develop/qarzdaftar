import { z } from "zod";

export const uuid = z.string().uuid();
export const money = z.number().int().positive().max(100_000_000_000);
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const phone = z.string().regex(/^\+[0-9]{9,15}$/);

export const customerCreate = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone: phone.optional(),
  photo_path: z.string().max(300).optional(),
  note: z.string().max(500).optional(),
});
export const customerPatch = customerCreate.partial().strict();

export const debtCreate = z.object({
  customer_id: uuid, amount: money, due_on: isoDate,
  issued_on: isoDate.optional(), comment: z.string().max(500).optional(),
});
export const debtPatch = z.object({
  amount: money.optional(), due_on: isoDate.optional(), comment: z.string().max(500).optional(),
}).strict();
export const reasonBody = z.object({ reason: z.string().trim().min(3).max(500) });

export const paymentCreate = z.object({
  amount: money, paid_on: isoDate.optional(),
  method: z.enum(["cash", "card", "transfer", "other"]).default("cash"),
  note: z.string().max(500).optional(),
  idempotency_key: uuid.optional(),
});
export const settleBody = z.object({ paid_on: isoDate.optional(), note: z.string().max(500).optional() });

export const subscriptionRequest = z.object({
  plan_id: uuid, reference: z.string().max(200).optional(), proof_path: z.string().max(300).optional(),
});
export const conversationCreate = z.object({ subject: z.string().trim().min(3).max(150), body: z.string().trim().min(1).max(4000) });
export const messageCreate = z.object({
  body: z.string().trim().max(4000).optional(),
  attachment_path: z.string().max(300).optional(), attachment_name: z.string().max(200).optional(),
  attachment_type: z.string().max(100).optional(), attachment_size: z.number().int().positive().max(10_485_760).optional(),
}).refine((v) => !!v.body || !!v.attachment_path, "empty message");
export const notificationsRead = z.object({ ids: z.array(uuid).max(200).optional() });

export const storeStatusBody = z.object({ status: z.enum(["active", "blocked"]), reason: z.string().trim().max(500).optional() });
export const grantBody = z.object({ store_id: uuid, plan_id: uuid, price_uzs: z.number().int().min(0).optional(), note: z.string().max(200).optional() });
export const planCreate = z.object({
  code: z.string().regex(/^[a-z0-9_]{2,40}$/), name: z.string().min(2).max(80),
  duration_months: z.number().int().min(1).max(36), price_uzs: z.number().int().min(0).max(100_000_000_000),
  is_active: z.boolean().optional(), sort_order: z.number().int().optional(),
});
export const planPatch = planCreate.omit({ code: true }).partial().strict();
export const registerBody = z.object({ name: z.string().trim().min(2).max(120), city: z.string().max(80).optional(), address: z.string().max(240).optional() });
