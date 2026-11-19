# QarzDaftar — платформа учёта долгов

Next.js 15 · TypeScript · Tailwind · Supabase (PostgreSQL, Auth, Realtime, Storage) · PWA.

*Qarz unutilmaydi. Munosabat buzilmaydi.*

Два интерфейса в одном проекте: **Store App** (`/app`) для магазинов и **Admin Panel** (`/admin`) для владельца платформы. Данные в одной базе, безопасность обеспечивает PostgreSQL (RLS, ограничения, триггеры).

## Статус
| Часть | Состояние |
|---|---|
| Схема БД (11 таблиц), RLS, RPC, аудит, Storage | готово, проверено тестом на PostgreSQL 16 |
| API (29 эндпоинтов), авторизация по телефону, middleware, PWA-каркас | готово, `tsc` и `next build` проходят |
| Экраны Store App и Admin Panel | **заглушки**; рабочий дизайн в `design/qarzdaftar-prototype.html` (не изменён) |
| Проверка на реальном проекте Supabase (SMS, Realtime, Storage) | нужно сделать при подключении |
| Платёжные системы, WhatsApp/SMS-напоминания клиентам, Web Push | не подключены |

## Быстрый старт
```bash
npm install
cp .env.example .env.local        # заполните ключи Supabase
npx supabase link --project-ref <REF> && npx supabase db push
npm run dev
```
Подробно: `docs/SUPABASE_SETUP.md`. Архитектура: `docs/ARCHITECTURE.md`. API: `docs/API.md`.

## Тест безопасности и денег
`npm run db:test` (локальная БД после `supabase db reset`). Ожидаемый результат: `ALL TESTS PASSED`.
