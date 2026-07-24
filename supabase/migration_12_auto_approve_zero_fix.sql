-- CVCraft — фікс: pricing_settings_auto_approve_after_minutes_check дозволяв
-- лише > 0, тому auto_approve_after_minutes = 0 (миттєве схвалення) падало
-- з db_error при збереженні. Замінюємо на >= 0.

alter table public.pricing_settings
  drop constraint if exists pricing_settings_auto_approve_after_minutes_check;

alter table public.pricing_settings
  add constraint pricing_settings_auto_approve_after_minutes_check
    check (auto_approve_after_minutes >= 0);
