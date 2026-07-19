-- CVCraft — схема бази даних Supabase
-- Виконайте цей скрипт у Supabase: SQL Editor → New query → вставити → Run
-- Скидає й перестворює таблиці users/resumes з нуля.

drop table if exists public.resumes;
drop table if exists public.users;

-- Користувачі Telegram
create table public.users (
  telegram_id text primary key,
  telegram_username text,
  first_name text,
  created_at timestamptz not null default now()
);

-- Резюме, максимум 2 на користувача (обмеження нижче тригером)
create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  telegram_id text not null references public.users (telegram_id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index resumes_telegram_id_idx on public.resumes (telegram_id);

-- Автооновлення updated_at при кожному записі
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists resumes_set_updated_at on public.resumes;
create trigger resumes_set_updated_at
  before update on public.resumes
  for each row execute procedure public.set_updated_at();

-- Ліміт: не більше 2 резюме на одного telegram_id
create or replace function public.enforce_resume_limit()
returns trigger as $$
declare
  current_count int;
begin
  select count(*) into current_count
  from public.resumes
  where telegram_id = new.telegram_id;

  if current_count >= 2 then
    raise exception 'resume_limit_reached: maximum 2 resumes per user';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists resumes_limit_check on public.resumes;
create trigger resumes_limit_check
  before insert on public.resumes
  for each row execute procedure public.enforce_resume_limit();

-- RLS: додаток працює через anon-ключ і сам фільтрує записи за telegram_id
-- (немає вбудованої Supabase-автентифікації), тож дозволяємо anon-ключу
-- читати й писати. Для продакшн-рівня безпеки додайте Supabase Auth
-- або перевірку telegram_id через Edge Function.
alter table public.users enable row level security;
alter table public.resumes enable row level security;

drop policy if exists "anon full access" on public.users;
create policy "anon full access" on public.users
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists "anon full access" on public.resumes;
create policy "anon full access" on public.resumes
  for all
  to anon
  using (true)
  with check (true);
