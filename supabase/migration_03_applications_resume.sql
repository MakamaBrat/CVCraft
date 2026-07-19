-- CVCraft — міграція №3: відгуки з прикріпленим резюме
-- Виконати ПІСЛЯ migration_02_vacancies.sql. Ідемпотентно (можна запускати повторно).

alter table public.vacancy_applications
  add column if not exists resume_id uuid references public.resumes (id) on delete set null;

alter table public.vacancy_applications
  add column if not exists resume_snapshot jsonb;
  -- знімок даних резюме на момент відгуку (ім'я, посада, навички, summary тощо),
  -- зберігається окремо від resumes, щоб роботодавець бачив відгук навіть
  -- якщо кандидат пізніше видалить або змінить резюме.

create index if not exists vacancy_applications_resume_id_idx on public.vacancy_applications (resume_id);
