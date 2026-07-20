-- CVCraft — міграція №6: тарифікація за термін показу замість оплати за показ
-- Виконати ПІСЛЯ migration_05_pricing_settings.sql. Ідемпотентно.
--
-- Було: вакансія показувалась, поки shows_used < shows_purchased (оплата за
-- кожен показ окремо, price_per_show_stars за 1 показ).
--
-- Стало: вакансія показується до конкретної дати (vacancies.expires_at).
-- listing_price_stars — тепер ціна за ТИЖДЕНЬ звичайного розміщення.
-- Друга ціна (раніше price_per_show_stars) стає top_price_stars — ціна за
-- ТИЖДЕНЬ розміщення в топ-секторі (vacancies.top_until). Поки top_until
-- в майбутньому — вакансія показується у топі списку.

-- ── pricing_settings: price_per_show_stars → top_price_stars ───────────────
alter table public.pricing_settings
  add column if not exists top_price_stars integer;

update public.pricing_settings
set top_price_stars = coalesce(top_price_stars, price_per_show_stars, 5)
where id = 1;

alter table public.pricing_settings
  alter column top_price_stars set default 5;

alter table public.pricing_settings
  alter column top_price_stars set not null;

alter table public.pricing_settings
  drop column if exists price_per_show_stars;

comment on column public.pricing_settings.listing_price_stars is 'Ціна звичайного розміщення вакансії, зірок за 1 тиждень';
comment on column public.pricing_settings.top_price_stars is 'Ціна розміщення в топ-секторі, зірок за 1 тиждень (додатково до звичайного)';

-- ── vacancies: лічильники показів → дати ────────────────────────────────────
alter table public.vacancies
  add column if not exists expires_at timestamptz,
  add column if not exists top_until timestamptz;

-- register_vacancy_show() і колонки shows_* більше не використовуються —
-- показ вакансії тепер керується виключно датою expires_at.
drop function if exists public.register_vacancy_show(uuid);

alter table public.vacancies
  drop column if exists shows_purchased,
  drop column if exists shows_used,
  drop column if exists price_per_show;

alter table public.vacancies
  rename column listing_price to listing_price_snapshot;

create index if not exists vacancies_expires_at_idx on public.vacancies (expires_at);
create index if not exists vacancies_top_until_idx on public.vacancies (top_until);

-- ── vacancy_payments: shows_added → weeks_added ─────────────────────────────
alter table public.vacancy_payments
  add column if not exists weeks_added integer not null default 0;

update public.vacancy_payments set weeks_added = shows_added where weeks_added = 0;

alter table public.vacancy_payments
  drop column if exists shows_added;

-- kind тепер: 'listing' (перша публікація на N тижнів) | 'extend' (продовження
-- звичайного розміщення) | 'top' (докупівля/продовження топ-розміщення)
