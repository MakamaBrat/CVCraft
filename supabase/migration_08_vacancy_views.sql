-- CVCraft — міграція №8: лічильник переглядів вакансії
-- Виконати ПІСЛЯ migration_07_period_billing.sql. Ідемпотентно.
--
-- views_count росте кожного разу, коли кандидат відкриває деталі активної
-- вакансії (VacancyDetail). Власник вакансії бачить це число на своїй
-- панелі (список "Мої вакансії").

alter table public.vacancies
  add column if not exists views_count integer not null default 0;

comment on column public.vacancies.views_count is 'Кількість переглядів вакансії кандидатами (VacancyDetail)';

-- Атомарний інкремент — без гонки при паралельних переглядах.
-- Рахуємо перегляд лише для активних вакансій.
create or replace function public.increment_vacancy_views(p_vacancy_id uuid)
returns void as $$
begin
  update public.vacancies
  set views_count = views_count + 1
  where id = p_vacancy_id
    and status = 'active';
end;
$$ language plpgsql;
