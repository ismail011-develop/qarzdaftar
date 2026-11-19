-- =====================================================================
-- QarzDaftar | 0001_schema.sql | types, tables, constraints, indexes
-- All money: bigint, whole UZS. All ids: uuid.
-- =====================================================================
create type public.user_role           as enum ('owner', 'admin');
create type public.store_status        as enum ('pending', 'active', 'blocked');
create type public.debt_status         as enum ('open', 'partial', 'paid', 'cancelled');
create type public.payment_status      as enum ('confirmed', 'voided');
create type public.subscription_status as enum ('pending', 'active', 'expired', 'rejected', 'cancelled');
create type public.conversation_status as enum ('open', 'closed');
create type public.notification_type   as enum (
  'debt_due_soon','debt_overdue','payment_received',
  'subscription_requested','subscription_confirmed','subscription_rejected',
  'subscription_expiring','subscription_expired',
  'support_message','store_status','system');

create or replace function public.today_tashkent() returns date
language sql stable set search_path = '' as
$$ select (now() at time zone 'Asia/Tashkent')::date $$;

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as
$$ begin new.updated_at := now(); return new; end $$;

-- 1. profiles --------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       public.user_role not null default 'owner',
  full_name  text not null default '' check (char_length(full_name) <= 120),
  phone      text unique check (phone ~ '^\+[0-9]{9,15}$'),
  language   text not null default 'uz' check (language in ('uz','ru','en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. stores ----------------------------------------------------------
create table public.stores (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null unique references public.profiles(id) on delete restrict,
  name              text not null check (char_length(trim(name)) between 2 and 120),
  city              text check (char_length(city) <= 80),
  address           text check (char_length(address) <= 240),
  status            public.store_status not null default 'pending',
  blocked_reason    text,
  status_changed_at timestamptz,
  status_changed_by uuid references public.profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint stores_blocked_has_reason check (status <> 'blocked' or blocked_reason is not null)
);

-- 3. customers -------------------------------------------------------
create table public.customers (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references public.stores(id) on delete restrict,
  full_name  text not null check (char_length(trim(full_name)) between 2 and 120),
  phone      text check (phone ~ '^\+[0-9]{9,15}$'),
  photo_path text,
  note       text check (char_length(note) <= 500),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, store_id)               -- target for composite FKs (tenant integrity)
);
create unique index customers_store_phone_uq on public.customers (store_id, phone)
  where deleted_at is null and phone is not null;
create index customers_store_name_idx on public.customers (store_id, lower(full_name))
  where deleted_at is null;

-- 4. debts -----------------------------------------------------------
create table public.debts (
  id               uuid primary key default gen_random_uuid(),
  store_id         uuid not null,
  customer_id      uuid not null,
  amount           bigint not null check (amount > 0 and amount <= 100000000000),
  paid_amount      bigint not null default 0 check (paid_amount >= 0),
  remaining_amount bigint generated always as (amount - paid_amount) stored,
  status           public.debt_status not null default 'open',
  issued_on        date not null default public.today_tashkent(),
  due_on           date not null,
  comment          text check (char_length(comment) <= 500),
  created_by       uuid references public.profiles(id),
  cancelled_at     timestamptz,
  cancel_reason    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint debts_paid_le_amount    check (paid_amount <= amount),
  constraint debts_due_after_issue   check (due_on >= issued_on),
  constraint debts_cancel_consistent check ((status = 'cancelled') = (cancelled_at is not null)),
  constraint debts_customer_fk foreign key (customer_id, store_id)
    references public.customers (id, store_id) on delete restrict,
  unique (id, store_id)
);
create index debts_store_status_due_idx on public.debts (store_id, status, due_on);
create index debts_customer_idx         on public.debts (customer_id);

-- 5. payments (append-only ledger) -----------------------------------
create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null,
  debt_id         uuid not null,
  amount          bigint not null check (amount > 0 and amount <= 100000000000),
  paid_on         date not null default public.today_tashkent(),
  method          text not null default 'cash' check (method in ('cash','card','transfer','other')),
  note            text check (char_length(note) <= 500),
  status          public.payment_status not null default 'confirmed',
  idempotency_key uuid,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  voided_at       timestamptz,
  voided_by       uuid references public.profiles(id),
  void_reason     text check (char_length(void_reason) between 3 and 500),
  constraint payments_void_consistent
    check ((status = 'voided') = (voided_at is not null and void_reason is not null)),
  constraint payments_debt_fk foreign key (debt_id, store_id)
    references public.debts (id, store_id) on delete restrict
);
create unique index payments_idem_uq on public.payments (store_id, idempotency_key)
  where idempotency_key is not null;
create index payments_debt_idx  on public.payments (debt_id);
create index payments_store_day on public.payments (store_id, paid_on) where status = 'confirmed';

-- 6. subscription_plans ---------------------------------------------
create table public.subscription_plans (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique check (code ~ '^[a-z0-9_]{2,40}$'),
  name            text not null check (char_length(name) between 2 and 80),
  duration_months integer not null check (duration_months between 1 and 36),
  price_uzs       bigint not null check (price_uzs >= 0 and price_uzs <= 100000000000),
  is_active       boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 7. subscriptions ---------------------------------------------------
create table public.subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  store_id           uuid not null references public.stores(id) on delete restrict,
  plan_id            uuid not null references public.subscription_plans(id) on delete restrict,
  status             public.subscription_status not null default 'pending',
  duration_months    integer not null check (duration_months > 0),   -- snapshot of plan
  price_uzs          bigint  not null check (price_uzs >= 0),        -- snapshot of plan
  starts_at          timestamptz,
  ends_at            timestamptz,
  payment_method     text not null default 'manual',
  payment_reference  text check (char_length(payment_reference) <= 200),
  payment_proof_path text,
  submitted_at       timestamptz not null default now(),
  reviewed_by        uuid references public.profiles(id),
  reviewed_at        timestamptz,
  reject_reason      text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint subscriptions_active_dates check
    (status not in ('active','expired') or (starts_at is not null and ends_at is not null and ends_at > starts_at))
);
create index subscriptions_store_idx on public.subscriptions (store_id, status, ends_at);
create unique index subscriptions_one_pending on public.subscriptions (store_id) where status = 'pending';

-- 8. support_conversations ------------------------------------------
create table public.support_conversations (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references public.stores(id) on delete cascade,
  subject         text not null check (char_length(trim(subject)) between 3 and 150),
  status          public.conversation_status not null default 'open',
  created_by      uuid not null references public.profiles(id),
  last_message_at timestamptz not null default now(),
  closed_at       timestamptz,
  closed_by       uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  constraint conv_closed_consistent check ((status = 'closed') = (closed_at is not null))
);
create index conv_store_idx on public.support_conversations (store_id, status, last_message_at desc);

-- 9. support_messages ------------------------------------------------
create table public.support_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  store_id        uuid not null references public.stores(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id),
  sender_role     public.user_role not null,
  body            text check (char_length(body) <= 4000),
  attachment_path text,
  attachment_name text check (char_length(attachment_name) <= 200),
  attachment_type text check (char_length(attachment_type) <= 100),
  attachment_size integer check (attachment_size between 1 and 10485760),
  read_at         timestamptz,
  created_at      timestamptz not null default now(),
  constraint msg_has_content check (nullif(trim(coalesce(body, '')), '') is not null or attachment_path is not null)
);
create index msg_conv_idx on public.support_messages (conversation_id, created_at);

-- 10. notifications --------------------------------------------------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  store_id   uuid references public.stores(id) on delete cascade,
  type       public.notification_type not null,
  title      text not null,
  body       text,
  data       jsonb not null default '{}'::jsonb,
  dedupe_key text,
  read_at    timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);
create index notif_user_idx   on public.notifications (user_id, created_at desc);
create index notif_unread_idx on public.notifications (user_id) where read_at is null;

-- 11. audit_logs (append-only) --------------------------------------
create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid,
  store_id    uuid,
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  before_data jsonb,
  after_data  jsonb,
  created_at  timestamptz not null default now()
);
create index audit_store_idx on public.audit_logs (store_id, created_at desc);
create index audit_actor_idx on public.audit_logs (actor_id, created_at desc);

create trigger trg_profiles_updated  before update on public.profiles  for each row execute function public.set_updated_at();
create trigger trg_stores_updated    before update on public.stores    for each row execute function public.set_updated_at();
create trigger trg_customers_updated before update on public.customers for each row execute function public.set_updated_at();
create trigger trg_debts_updated     before update on public.debts     for each row execute function public.set_updated_at();
create trigger trg_plans_updated     before update on public.subscription_plans for each row execute function public.set_updated_at();
create trigger trg_subs_updated      before update on public.subscriptions for each row execute function public.set_updated_at();
