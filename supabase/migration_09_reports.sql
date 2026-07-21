-- CVCraft — міграція №9: скарги (жалоби)
-- Виконати ПІСЛЯ migration_08_vacancy_views.sql. Ідемпотентно.
--
-- Дві сутності жалоб, обидві в одній таблиці:
--  1) type = 'vacancy'   — будь-хто скаржиться на оголошення вакансії.
--                          target_telegram_id = власник вакансії.
--  2) type = 'applicant' — власник вакансії скаржиться на кандидата,
--                          який відгукнувся (по конкретному відгуку).
--                          target_telegram_id = автор відгуку.
--
-- Усі запити йдуть тільки через service-role (/api/report.js, /api/admin.js),
-- як і решта приватних таблиць після migration_04_security_hardening —
-- тому RLS увімкнено, але жодної policy для anon не додаємо (deny by default).

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  type text not null,                          -- 'vacancy' | 'applicant'

  reporter_telegram_id text not null references public.users (telegram_id) on delete cascade,
  target_telegram_id text not null references public.users (telegram_id) on delete cascade,

  vacancy_id uuid references public.vacancies (id) on delete cascade,
  application_id uuid references public.vacancy_applications (id) on delete cascade,

  reason text not null,                        -- короткий код причини (spam/scam/...)
  comment text,                                 -- вільний коментар скаржника

  status text not null default 'open',          -- 'open' | 'resolved' | 'dismissed'
  resolved_by text,
  resolved_at timestamptz,

  created_at timestamptz not null default now(),

  constraint reports_type_chk check (type in ('vacancy', 'applicant')),
  constraint reports_status_chk check (status in ('open', 'resolved', 'dismissed')),
  -- vacancy-скарга завжди прив'язана до вакансії (без відгуку),
  -- applicant-скарга завжди прив'язана до конкретного відгуку.
  constraint reports_target_chk check (
    (type = 'vacancy' and vacancy_id is not null and application_id is null) or
    (type = 'applicant' and application_id is not null)
  )
);

create index if not exists reports_status_idx on public.reports (status);
create index if not exists reports_vacancy_id_idx on public.reports (vacancy_id);
create index if not exists reports_application_id_idx on public.reports (application_id);
create index if not exists reports_target_telegram_id_idx on public.reports (target_telegram_id);

-- Не даємо одному й тому ж юзеру заспамити чергу дублями відкритих скарг
-- на той самий об'єкт — часткові унікальні індекси лише для status='open'.
create unique index if not exists reports_unique_open_vacancy
  on public.reports (reporter_telegram_id, vacancy_id)
  where status = 'open' and type = 'vacancy';

create unique index if not exists reports_unique_open_application
  on public.reports (reporter_telegram_id, application_id)
  where status = 'open' and type = 'applicant';

-- ── RLS ──────────────────────────────────────────────────────────────────
alter table public.reports enable row level security;
-- жодної policy для anon не створюємо => доступ лише через service-role API
revoke all on public.reports from anon;
