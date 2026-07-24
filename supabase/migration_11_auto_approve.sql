-- CVCraft — міграція №11: автоапрув вакансій
-- Виконати ПІСЛЯ migration_10_report_resume.sql. Ідемпотентно.
--
-- /api/admin.js (action: "setAutoApprove") і /api/_lib/pricing.js
-- (getCurrentPricing) вже читають/пишуть auto_approve_enabled та
-- auto_approve_after_minutes в pricing_settings — але самих колонок у
-- таблиці ще не було створено жодною попередньою міграцією. Через це:
--   - збереження налаштування падало з db_error (upsert у неіснуючу колонку),
--   - GET ?action=pricing падав з тієї ж причини після того, як ці поля
--     додали в SELECT,
-- а на фронті це виглядало як "автоапрув сам вимикається" / "адмінка
-- сбивается після перезаходу".

alter table public.pricing_settings
  add column if not exists auto_approve_enabled boolean not null default false;

alter table public.pricing_settings
  add column if not exists auto_approve_after_minutes integer not null default 60
    check (auto_approve_after_minutes >= 0);

comment on column public.pricing_settings.auto_approve_enabled is
  'Якщо true — вакансії, що чекають на модерацію довше auto_approve_after_minutes, схвалюються автоматично.';
comment on column public.pricing_settings.auto_approve_after_minutes is
  'Скільки хвилин вакансія має чекати в pending_review перед автосхваленням. 0 = миттєво.';
