-- =====================================================================
-- QarzDaftar | 0003_rls.sql | least-privilege grants + Row Level Security
-- Principle: deny by default. Users get SELECT (filtered by RLS) and a few
-- column-limited writes. Everything financial goes through RPC functions.
-- =====================================================================

-- 1) Remove Supabase's permissive defaults ---------------------------
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- 2) Enable RLS on every table ---------------------------------------
alter table public.profiles              enable row level security;
alter table public.stores                enable row level security;
alter table public.customers             enable row level security;
alter table public.debts                 enable row level security;
alter table public.payments              enable row level security;
alter table public.subscription_plans    enable row level security;
alter table public.subscriptions         enable row level security;
alter table public.support_conversations enable row level security;
alter table public.support_messages      enable row level security;
alter table public.notifications         enable row level security;
alter table public.audit_logs            enable row level security;

-- 3) Table / column privileges for signed-in users -------------------
grant select on public.profiles, public.stores, public.customers, public.debts, public.payments,
                public.subscription_plans, public.subscriptions, public.support_conversations,
                public.support_messages, public.notifications, public.audit_logs,
                public.customer_balances, public.admin_store_overview
  to authenticated;

grant update (full_name, language)           on public.profiles           to authenticated;  -- never role / phone
grant update (name, city, address)           on public.stores             to authenticated;  -- never status / owner
grant insert (store_id, full_name, phone, photo_path, note)  on public.customers to authenticated;
grant update (full_name, phone, photo_path, note, deleted_at) on public.customers to authenticated; -- soft delete only
grant insert (code, name, duration_months, price_uzs, is_active, sort_order) on public.subscription_plans to authenticated;
grant update (name, duration_months, price_uzs, is_active, sort_order)       on public.subscription_plans to authenticated;
grant insert (conversation_id, body, attachment_path, attachment_name, attachment_type, attachment_size)
  on public.support_messages to authenticated;
grant update (read_at) on public.notifications to authenticated;
-- debts, payments, subscriptions, audit_logs: SELECT only -> writes only via RPC.

-- 4) Policies ---------------------------------------------------------
-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- stores
create policy stores_select on public.stores for select to authenticated
  using (owner_id = auth.uid() or public.is_admin());
create policy stores_update_own on public.stores for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- customers (admin deliberately has NO access to shop customer data)
create policy customers_select on public.customers for select to authenticated
  using (public.owns_store(store_id));
create policy customers_insert on public.customers for insert to authenticated
  with check (public.owns_store(store_id) and public.store_can_write(store_id));
create policy customers_update on public.customers for update to authenticated
  using (public.owns_store(store_id) and public.store_can_write(store_id))
  with check (public.owns_store(store_id));

-- debts / payments: read-only for owners, no admin access
create policy debts_select on public.debts for select to authenticated
  using (public.owns_store(store_id));
create policy payments_select on public.payments for select to authenticated
  using (public.owns_store(store_id));

-- subscription plans
create policy plans_select on public.subscription_plans for select to authenticated
  using (is_active or public.is_admin());
create policy plans_insert_admin on public.subscription_plans for insert to authenticated
  with check (public.is_admin());
create policy plans_update_admin on public.subscription_plans for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- subscriptions
create policy subscriptions_select on public.subscriptions for select to authenticated
  using (public.owns_store(store_id) or public.is_admin());

-- support (works even when subscription is expired or store is blocked)
create policy conv_select on public.support_conversations for select to authenticated
  using (public.owns_store(store_id) or public.is_admin());
create policy msg_select on public.support_messages for select to authenticated
  using (public.owns_store(store_id) or public.is_admin());
create policy msg_insert on public.support_messages for insert to authenticated
  with check (public.owns_store(store_id) or public.is_admin());   -- store_id/sender are set by trigger

-- notifications
create policy notif_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notif_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- audit
create policy audit_select on public.audit_logs for select to authenticated
  using (public.is_admin() or (store_id is not null and public.owns_store(store_id)));

-- 5) Function privileges ----------------------------------------------
grant execute on function
  public.is_admin(), public.owns_store(uuid), public.store_has_active_subscription(uuid),
  public.store_can_write(uuid), public.today_tashkent(), public.storage_store_id(text),
  -- store
  public.register_store(text, text, text),
  public.create_debt(uuid, bigint, date, text, date),
  public.update_debt(uuid, bigint, date, text),
  public.cancel_debt(uuid, text),
  public.record_payment(uuid, bigint, date, text, text, uuid),
  public.settle_debt(uuid, date, text),
  public.void_payment(uuid, text),
  public.get_store_stats(date, date),
  public.request_subscription(uuid, text, text),
  -- support
  public.open_conversation(text, text),
  public.close_conversation(uuid),
  public.mark_conversation_read(uuid),
  -- admin (each one re-checks is_admin() internally)
  public.admin_confirm_subscription(uuid),
  public.admin_reject_subscription(uuid, text),
  public.admin_grant_subscription(uuid, uuid, bigint, text),
  public.admin_set_store_status(uuid, public.store_status, text),
  public.admin_dashboard_stats(),
  public.admin_check_store(uuid)
to authenticated;
-- generate_due_notifications() and expire_subscriptions(): service_role / pg_cron only.

-- 6) Realtime (RLS is applied to realtime events) ----------------------
alter publication supabase_realtime add table
  public.support_messages, public.support_conversations, public.notifications;

grant execute on function public.generate_due_notifications(), public.expire_subscriptions() to service_role;
