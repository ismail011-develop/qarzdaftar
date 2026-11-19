# QarzDaftar — API

Все эндпоинты требуют сессию Supabase (cookie). Ответ успешный: `{ "data": ... }`. Ошибка: `{ "error": { "code", "message", "details?" } }`.
Суммы только целые, в сумах. Даты: `YYYY-MM-DD`. Часовой пояс расчётов: Asia/Tashkent.
Права проверяются в базе (RLS и RPC), API лишь проверяет ввод через zod.

## Коды ошибок

| HTTP | code |
|---|---|
| 401 | `not_authenticated` |
| 402 | `subscription_inactive_or_store_blocked` (запись запрещена, чтение работает) |
| 403 | `forbidden`, `store_blocked` |
| 404 | `store_not_found`, `customer_not_found`, `debt_not_found`, `payment_not_found`, `conversation_not_found`, `subscription_not_found`, `plan_not_found` |
| 409 | `debt_has_payments`, `debt_cancelled`, `already_voided`, `already_paid`, `store_already_exists`, `pending_request_exists`, `conversation_closed`, `customer_has_open_debts`, `invalid_state`, `payment_immutable`, `duplicate` |
| 422 | `validation_error`, `invalid_amount`, `overpayment`, `amount_below_paid`, `future_date`, `reason_required`, `invalid_attachment_path`, `constraint_violation` |
| 500 | `internal_error` (подробности только в серверных логах) |

## Store App (владелец магазина)

| Метод и путь | Тело / параметры | Действие |
|---|---|---|
| GET `/api/store` | | магазин и состояние подписки |
| POST `/api/store` | `{name, city?, address?}` | регистрация магазина (RPC `register_store`) |
| PATCH `/api/store` | `{name?, city?, address?}` | изменить данные (статус менять нельзя) |
| GET `/api/customers` | `?q=` | клиенты с балансами, поиск по имени и телефону |
| POST `/api/customers` | `{full_name, phone?, photo_path?, note?}` | добавить клиента |
| GET `/api/customers/:id` | | клиент, его долги и платежи |
| PATCH `/api/customers/:id` | поля клиента | изменить |
| DELETE `/api/customers/:id` | | мягкое удаление (нельзя при открытых долгах) |
| GET `/api/debts` | `?status=&customer_id=&overdue=1&limit=` | список долгов |
| POST `/api/debts` | `{customer_id, amount, due_on, issued_on?, comment?}` | создать долг |
| GET `/api/debts/:id` | | долг и его платежи |
| PATCH `/api/debts/:id` | `{amount?, due_on?, comment?}` | править (сумма не меньше уже оплаченного) |
| POST `/api/debts/:id/cancel` | `{reason}` | отменить долг без платежей |
| POST `/api/debts/:id/payments` | `{amount, paid_on?, method?, note?, idempotency_key?}` | частичная или полная оплата |
| POST `/api/debts/:id/settle` | `{paid_on?, note?}` | закрыть остаток целиком |
| GET `/api/payments` | `?debt_id=&status=&limit=` | журнал операций, включая аннулированные |
| POST `/api/payments/:id/void` | `{reason}` | исправить ошибку: аннулировать с сохранением истории |
| GET `/api/stats` | `?from=&to=` | остаток, просрочка, собрано, выдано, график по дням, топ-5 должников |
| GET / PATCH `/api/notifications` | `?unread=1` / `{ids?}` | список и пометка прочитанным |
| GET / POST `/api/subscriptions` | `{plan_id, reference?, proof_path?}` | тарифы и история / заявка на оплату |
| GET / POST `/api/support/conversations` | `{subject, body}` | обращения / новое обращение |
| GET / POST `/api/support/conversations/:id/messages` | `{body?, attachment_*}` | сообщения (отправителя ставит БД) |
| POST `/api/support/conversations/:id/read` | | отметить прочитанным |
| POST `/api/support/conversations/:id/close` | | закрыть обращение |

Напоминание клиенту через WhatsApp или SMS в этом этапе не реализовано: нужен подключённый провайдер. Сейчас можно открыть ссылку `https://wa.me/<номер>?text=...` или `sms:` на клиенте.

## Admin Panel (только `role = admin`)

| Метод и путь | Действие |
|---|---|
| GET `/api/admin/dashboard` | магазины, пользователи, доходы, регистрации, график по месяцам, разбивка по тарифам |
| GET `/api/admin/stores?status=&q=` | список магазинов с владельцем и текущей подпиской |
| POST `/api/admin/stores/:id/status` `{status: active\|blocked, reason?}` | активировать, заблокировать (причина обязательна) или разблокировать |
| GET `/api/admin/stores/:id/check` | Check: статус, подписка, дни до конца, последний платёж, блокировка, действия админов |
| GET `/api/admin/subscriptions?status=pending` | очередь проверки платежей |
| POST `/api/admin/subscriptions/:id/confirm` | подтвердить оплату вручную |
| POST `/api/admin/subscriptions/:id/reject` `{reason}` | отклонить |
| POST `/api/admin/subscriptions/grant` `{store_id, plan_id, price_uzs?, note?}` | подключить, продлить или сменить тариф |
| GET, POST `/api/admin/plans` и PATCH `/api/admin/plans/:id` | тарифы (цена и срок), уже оформленные подписки сохраняют старую цену |
| GET `/api/admin/audit?store_id=&entity_type=&actor_id=` | журнал аудита |
| Чат | те же `/api/support/...`, админ видит обращения всех магазинов |

## Служебное

`GET /api/cron/daily` с заголовком `Authorization: Bearer $CRON_SECRET`. Помечает истёкшие подписки, шлёт напоминания о сроках долгов и подписок. Вызывается Vercel Cron (`vercel.json`, 03:00 UTC, то есть 08:00 в Ташкенте).

## Realtime (с клиента, под сессией пользователя)

```ts
supabase.channel("chat:" + conversationId)
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages",
        filter: "conversation_id=eq." + conversationId }, onMessage)
  .subscribe();
supabase.channel("notif")
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications",
        filter: "user_id=eq." + userId }, onNotification)
  .subscribe();
```

## Файлы (Storage, бакеты приватные)

Путь строго `<store_id>/<имя>`, иначе политика откажет.
`customer-photos` (JPEG, PNG, WebP до 2 МБ), `support-attachments` (+PDF, до 10 МБ), `payment-proofs` (до 5 МБ). Чтение через `createSignedUrl`.
