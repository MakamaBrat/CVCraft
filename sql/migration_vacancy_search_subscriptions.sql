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
