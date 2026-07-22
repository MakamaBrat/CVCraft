-- CVCraft — міграція №10: скарга на резюме (третій тип, поруч з vacancy/applicant)
-- Виконати ПІСЛЯ migration_09_reports.sql. Ідемпотентно.
--
-- Додає type = 'resume' — будь-хто (напр. роботодавець) скаржиться на
-- резюме, побачене на сторінці шаринга. target_telegram_id = власник резюме.
-- resume_id зберігаємо окремою колонкою (а не через vacancy_id/application_id,
-- які прив'язані до інших сутностей).

alter table public.reports
  add column if not exists resume_id uuid references public.resumes (id) on delete cascade;

create index if not exists reports_resume_id_idx on public.reports (resume_id);

alter table public.reports drop constraint if exists reports_type_chk;
alter table public.reports
  add constraint reports_type_chk check (type in ('vacancy', 'applicant', 'resume'));

alter table public.reports drop constraint if exists reports_target_chk;
alter table public.reports
  add constraint reports_target_chk check (
    (type = 'vacancy' and vacancy_id is not null and application_id is null and resume_id is null) or
    (type = 'applicant' and application_id is not null and resume_id is null) or
    (type = 'resume' and resume_id is not null and vacancy_id is null and application_id is null)
  );

create unique index if not exists reports_unique_open_resume
  on public.reports (reporter_telegram_id, resume_id)
  where status = 'open' and type = 'resume';
