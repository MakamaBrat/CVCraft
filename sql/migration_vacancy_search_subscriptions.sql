-- Підписки на "дзвіночок" пошуку вакансій. Один рядок = один збережений
-- фільтр (query + city) одного юзера. Коли публікується нова вакансія,
-- якій відповідає фільтр, /api/_lib/telegramNotify.js шле повідомлення
-- через бота.
--
-- Доступ до цієї таблиці йде тільки через service-role ключ у serverless
-- функціях (/api/vacancy-subscribe.js), як і до інших таблиць у проєкті —
-- тож RLS-політики читання/запису для anon тут не потрібні, досить
-- увімкнути RLS без жодних permissive policy (запечатує таблицю від
-- прямого anon-доступу, як і решта проєкту).

create table if not exists vacancy_search_subscriptions (
  id uuid primary key default gen_random_uuid(),
  telegram_id text not null,
  query text not null default '',
  city text,
  created_at timestamptz not null default now()
);

create index if not exists vacancy_search_subscriptions_telegram_id_idx
  on vacancy_search_subscriptions (telegram_id);

alter table vacancy_search_subscriptions enable row level security;

-- === Один юзер = одна підписка ===
-- Раніше юзер міг накопичити до MAX_SUBSCRIPTIONS_PER_USER (10) рядків
-- (по одному на кожен унікальний query/city). Тепер підписка одна: нове
-- збереження фільтра замінює попередній запис юзера. Це прибирає
-- накопичення рядків у таблиці й спрощує видалення (завжди рівно 0 або 1
-- рядок на telegram_id).

-- 1) Прибираємо дублікати, які могли накопичитись раніше: лишаємо тільки
--    найновіший рядок кожного юзера.
delete from vacancy_search_subscriptions a
  using vacancy_search_subscriptions b
  where a.telegram_id = b.telegram_id
    and a.created_at < b.created_at;

-- 2) На випадок кількох рядків з однаковим created_at (малоймовірно, але
--    unique-констрейнт нижче впаде, якщо лишиться дублікат) — лишаємо той,
--    що з більшим id.
delete from vacancy_search_subscriptions a
  using vacancy_search_subscriptions b
  where a.telegram_id = b.telegram_id
    and a.created_at = b.created_at
    and a.id < b.id;

-- 3) Гарантуємо на рівні БД, що на юзера лишається рівно один рядок.
alter table vacancy_search_subscriptions
  add constraint vacancy_search_subscriptions_telegram_id_key unique (telegram_id);
