# QarzDaftar — архитектура

## 1. Схема

```
 iPhone (Safari) · Android (Chrome) · Windows/Mac        PWA: manifest + service worker
 ┌────────────────────────┐   ┌──────────────────────────────┐
 │ Store App   /app       │   │ Admin Panel   /admin         │  отдельный адрес: ADMIN_HOST
 └───────────┬────────────┘   └───────────────┬──────────────┘
             └───────── Next.js 15 (App Router, TypeScript, Tailwind) ─────────┐
                  middleware.ts: сессия, редирект, проверка роли admin         │
                  /api/*  Route Handlers: zod → RPC/RLS → единый JSON-ответ    │
                      │ JWT пользователя (RLS работает)     │ service role     │
                      ▼                                     ▼ только /api/cron/daily
             Supabase Auth · PostgREST/RPC · Realtime · Storage (private)
                      ▼
             PostgreSQL: 11 таблиц, RLS, триггеры, SECURITY DEFINER-функции
```

Принцип: **безопасность живёт в базе**. Даже если API или клиент ошибутся, PostgreSQL не отдаст чужие данные и не позволит испортить деньги.

## 2. Таблицы и связи

```
auth.users 1─1 profiles(role: owner|admin)
profiles   1─1 stores(status: pending|active|blocked)
stores     1─N customers ─1─N debts ─1─N payments        (составные FK (id, store_id))
stores     1─N subscriptions N─1 subscription_plans
stores     1─N support_conversations 1─N support_messages
profiles   1─N notifications            audit_logs(actor_id, store_id, entity_*, before/after)
```

| Таблица | Назначение | Ключевые защиты |
|---|---|---|
| profiles | роль и язык | колонку `role` через API менять нельзя (GRANT + триггер); админ назначается только SQL |
| stores | магазин, статус, причина блокировки | владелец правит только name/city/address |
| customers | клиенты магазина | soft delete, нельзя при открытых долгах, уникальный телефон в магазине |
| debts | долги | `0 ≤ paid ≤ amount`, остаток вычисляемый, прямой записи нет |
| payments | журнал платежей | append-only: только `confirmed → voided` с причиной, DELETE/TRUNCATE запрещены |
| subscription_plans | тарифы (60 000 / 85 000) | пишет только админ; цена в подписке фиксируется снимком |
| subscriptions | заявки и периоды | подтверждает только админ (RPC), продление идёт от конца текущего периода |
| support_conversations / support_messages | чат | сообщения неизменяемы (меняется только `read_at`), отправитель и роль ставит триггер |
| notifications | уведомления | `dedupe_key` защищает от дублей, клиент меняет только `read_at` |
| audit_logs | журнал аудита | append-only, пишется триггерами на всех ключевых таблицах |

## 3. Как обеспечены требования

**Изоляция магазинов.** Все политики строятся на `owns_store(store_id)`. Составные внешние ключи `(customer_id, store_id)` и `(debt_id, store_id)` не позволяют связать данные разных магазинов даже при ошибке в коде.

**Деньги.** `bigint`, целые сумы, лимит 100 млрд. Остаток нельзя сделать отрицательным: CHECK `paid_amount ≤ amount`, RPC проверяет `overpayment`, триггер проверяет заново. Платёж блокирует строку долга (`FOR UPDATE`), поэтому два одновременных платежа не обгонят друг друга. `idempotency_key` защищает от двойной отправки формы.

**История платежей.** Ошибочный платёж не правится и не удаляется. Его аннулируют (`void_payment`, причина обязательна), остаток пересчитывается триггером, запись остаётся в журнале. Даже суперпользователь получает `payment_immutable`.

**Роль администратора.** Отдельное значение `role = 'admin'`. Назначается только SQL-командой или service role. Все `admin_*` функции повторно проверяют `is_admin()`. Админ не читает клиентов, долги и платежи магазинов (принцип минимальных прав). Ему доступны агрегаты, подписки, чат и аудит.

**Подписки.** Платные записи (клиенты, долги, платежи, фото) разрешены, только если магазин `active` и есть подписка `active` с `starts_at ≤ now() < ends_at`. Это проверяется в RLS и в RPC, поэтому блокировка срабатывает сразу по времени, а cron лишь ставит статус `expired` и шлёт уведомления. Чтение и чат остаются доступными, чтобы можно было продлить подписку.

**Критические операции только на сервере.** У роли `authenticated` нет INSERT/UPDATE/DELETE на debts, payments, subscriptions, audit_logs. Изменения идут через RPC, которые сами определяют магазин по `auth.uid()`.

**Реальное время.** В публикацию `supabase_realtime` добавлены support_messages, support_conversations, notifications. События фильтруются RLS.

## 4. Подписка: жизненный цикл

1. Владелец вызывает `POST /api/subscriptions` (тариф, номер перевода, чек в `payment-proofs`). Статус `pending`, админы получают уведомление.
2. Админ проверяет оплату вручную и вызывает `confirm` или `reject` (причина обязательна).
3. `confirm`: статус `active`, период начинается сейчас или с конца текущего, магазин `pending → active`.
4. Cron раз в сутки: за 5 дней шлёт предупреждение, после окончания ставит `expired`.
5. Повторная активация: новая заявка или `admin_grant_subscription`.

Платёжной интеграции нет, есть ручная проверка. Позже можно добавить Payme/Click: вебхук на сервере, который вызывает те же RPC через service role.

## 5. Структура проекта

```
qarzdaftar-platform/
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/ 0001_schema · 0002_functions · 0003_rls · 0004_storage · 0005_seed
│  └─ tests/security_and_money.test.sql
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx · page.tsx · login/page.tsx · globals.css
│  │  ├─ (store)/app/…  layout + экраны Store App
│  │  ├─ admin/…        layout (проверка роли) + экраны Admin Panel
│  │  └─ api/…          29 Route Handlers (см. docs/API.md)
│  ├─ components/       NavLinks · PwaRegister · RegisterStore · ScreenStub
│  └─ lib/              api.ts · schemas.ts · money.ts · supabase/{server,browser,service}.ts
├─ public/              manifest.webmanifest · sw.js · offline.html · icons/
├─ design/qarzdaftar-prototype.html   утверждённый прототип (не изменён)
├─ middleware.ts · next.config.mjs (CSP, HSTS) · tailwind.config.ts · vercel.json
└─ docs/                ARCHITECTURE · API · SUPABASE_SETUP
```

## 6. Что готово и что дальше

Готово и проверено: схема, ограничения, RLS, RPC, аудит, хранилище, тесты безопасности и денег на PostgreSQL 16, API, авторизация по телефону, middleware, PWA-каркас, тип-проверка проекта.

Следующий этап: перенос экранов из `design/qarzdaftar-prototype.html` в React-компоненты. Сейчас страницы `/app/*` и `/admin/*` это заглушки с перечнем API, дизайн из прототипа не менялся. Также нужны переключение языков uz/ru/en, загрузка файлов через Storage, Realtime-подписки в чате, splash-экраны для iOS и тесты на самом Supabase.
