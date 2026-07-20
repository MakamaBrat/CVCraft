-- CVCraft — міграція №7: тарифікація за періоди по 5 днів замість тижня
-- Виконати ПІСЛЯ migration_06_duration_pricing.sql. Ідемпотентно.
--
-- Було: listing_price_stars / top_price_stars — ціна за 1 ТИЖДЕНЬ (7 днів).
-- Стало: ті самі колонки тепер означають ціну за 1 ПЕРІОД = 5 днів
-- розміщення. Розрахунок дат (expires_at / top_until) у /api/bot.js тепер
-- додає payload.w * 5 днів замість payload.w * 7 днів.

comment on column public.pricing_settings.listing_price_stars is 'Ціна звичайного розміщення вакансії, зірок за 1 період (5 днів)';
comment on column public.pricing_settings.top_price_stars is 'Ціна розміщення в топ-секторі, зірок за 1 період (5 днів), додатково до звичайного';

-- ── vacancy_payments: weeks_added → periods_added (кількість періодів по 5 днів) ──
alter table public.vacancy_payments
  add column if not exists periods_added integer not null default 0;

update public.vacancy_payments set periods_added = weeks_added where periods_added = 0;

alter table public.vacancy_payments
  drop column if exists weeks_added;

comment on column public.vacancy_payments.periods_added is 'Кількість оплачених періодів по 5 днів';

-- ── vacancies: галочка "лише відгуки з резюме" ──────────────────────────────
-- Зберігається просто у vacancies.data (jsonb) як data->>'requireResume',
-- окрема колонка не потрібна — фронт і /api/vacancy-apply.js читають/пишуть
-- це поле напряму в jsonb-об'єкті вакансії.
