-- CVCraft — міграція №2: вакансії, модерація, оплата зірками, бани, активність
-- Виконати ПІСЛЯ schema.sql. Ідемпотентно (можна запускати повторно).

-- ── users: остання активність + бан ────────────────────────────────────────
alter table public.users
  add column if not exists last_active_at timestamptz not null default now();

alter table public.users
  add column if not exists is_banned boolean not null default false;

alter table public.users
  add column if not exists ban_reason text;

alter table public.users
  add column if not exists language_code text; -- 'uk' | 'ru' | 'en'

-- ── vacancies ────────────────────────────────────────────────────────────
create table if not exists public.vacancies (
  id uuid primary key default gen_random_uuid(),
  telegram_id text not null references public.users (telegram_id) on delete cascade,
  data jsonb not null,                -- вміст оголошення (як у resumes.data)
  template text not null default 'minimal',

  status text not null default 'draft',
  -- draft -> pending_review -> approved -> (очікує оплату) -> active
  --                         -> rejected
  -- активна вакансія показується, поки shows_used < shows_purchased

  reject_reason text,
  moderated_by text,
  moderated_at timestamptz,

  price_per_show integer not null default 1,     -- ціна одного показу, зірки
  listing_price integer not null default 500,     -- ціна публікації, зірки
  shows_purchased integer not null default 0,     -- скільки показів оплачено
  shows_used integer not null default 0,          -- скільки вже показано
  is_paid boolean not null default false,

  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists vacancies_telegram_id_idx on public.vacancies (telegram_id);
create index if not exists vacancies_status_idx on public.vacancies (status);

drop trigger if exists vacancies_set_updated_at on public.vacancies;
create trigger vacancies_set_updated_at
  before update on public.vacancies
  for each row execute procedure public.set_updated_at();

-- ── платежі за зірки (публікація й докупівля показів) ──────────────────────
create table if not exists public.vacancy_payments (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references public.vacancies (id) on delete cascade,
  telegram_id text not null references public.users (telegram_id) on delete cascade,
  kind text not null,                 -- 'listing' | 'extra_shows'
  stars_amount integer not null,
  shows_added integer not null default 0,
  telegram_payment_charge_id text,
  created_at timestamptz not null default now()
);

create index if not exists vacancy_payments_vacancy_id_idx on public.vacancy_payments (vacancy_id);

-- ── заявки на вакансії ──────────────────────────────────────────────────────
create table if not exists public.vacancy_applications (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references public.vacancies (id) on delete cascade,
  telegram_id text not null references public.users (telegram_id) on delete cascade,
  message text,
  contact text,
  created_at timestamptz not null default now()
);

create index if not exists vacancy_applications_vacancy_id_idx on public.vacancy_applications (vacancy_id);
create index if not exists vacancy_applications_telegram_id_idx on public.vacancy_applications (telegram_id);

-- ── лічильник показу (викликається, коли вакансія рендериться у списку) ────
create or replace function public.register_vacancy_show(p_vacancy_id uuid)
returns void as $$
begin
  update public.vacancies
  set shows_used = shows_used + 1
  where id = p_vacancy_id
    and status = 'active'
    and shows_used < shows_purchased;

  update public.vacancies
  set status = 'paused'
  where id = p_vacancy_id
    and status = 'active'
    and shows_used >= shows_purchased;
end;
$$ language plpgsql;

-- ── RLS ──────────────────────────────────────────────────────────────────
alter table public.vacancies enable row level security;
alter table public.vacancy_payments enable row level security;
alter table public.vacancy_applications enable row level security;

drop policy if exists "anon full access" on public.vacancies;
create policy "anon full access" on public.vacancies
  for all to anon using (true) with check (true);

drop policy if exists "anon full access" on public.vacancy_payments;
create policy "anon full access" on public.vacancy_payments
  for all to anon using (true) with check (true);

drop policy if exists "anon full access" on public.vacancy_applications;
create policy "anon full access" on public.vacancy_applications
  for all to anon using (true) with check (true);

-- Примітка про безпеку: як і в schema.sql, RLS тут відкритий для anon,
-- бо автентифікація йде через Telegram initData, а не Supabase Auth.
-- Список адмінів визначається на рівні застосунку через env-змінну
-- ADMIN_TELEGRAM_IDS (кома-розділений список), не в БД.
