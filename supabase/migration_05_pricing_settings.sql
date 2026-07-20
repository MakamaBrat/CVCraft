-- CVCraft — міграція №5: динамічні ціни на публікацію/показ вакансій
-- Виконати ПІСЛЯ migration_04_security_hardening.sql. Ідемпотентно.
--
-- Раніше ціни (500 ⭐ за публікацію, 1 ⭐ за показ) жили як default-значення
-- колонок vacancies.listing_price / vacancies.price_per_show — тобто
-- "замерзали" в кожному рядку вже в момент створення вакансії, і змінити їх
-- глобально можна було тільки міняючи default колонки (не впливає на старі
-- рядки) або правлячи кожен рядок окремо.
--
-- Ця міграція виносить ціни в окрему singleton-таблицю pricing_settings.
-- /api/vacancy-invoice.js тепер читає актуальну ціну звідси в момент
-- створення інвойсу (а не з застарілого значення в рядку вакансії), тож
-- зміна ціни в адмінці одразу діє на всі вакансії — і нові, і вже створені.

create table if not exists public.pricing_settings (
  id smallint primary key default 1,
  listing_price_stars integer not null default 500 check (listing_price_stars >= 0),
  price_per_show_stars integer not null default 1 check (price_per_show_stars >= 0),
  updated_by bigint,
  updated_at timestamptz not null default now(),
  constraint pricing_settings_singleton check (id = 1)
);

insert into public.pricing_settings (id, listing_price_stars, price_per_show_stars)
values (1, 500, 1)
on conflict (id) do nothing;

alter table public.pricing_settings enable row level security;

-- Публічне читання дозволене (щоб фронтенд показував актуальну ціну ДО
-- оплати, ще без авторизації) — рядок один, нічого приватного в ньому нема.
drop policy if exists "anon read pricing" on public.pricing_settings;
create policy "anon read pricing" on public.pricing_settings
  for select
  to anon
  using (true);

-- Запис — лише через service-role з /api/admin.js (перевірка isAdminId),
-- тому окремих insert/update policy для anon не додаємо.
revoke insert, update, delete on public.pricing_settings from anon;
grant select on public.pricing_settings to anon;
