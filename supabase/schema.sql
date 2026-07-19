-- CVCraft — схема бази даних Supabase
-- Виконайте цей скрипт у Supabase: SQL Editor → New query → вставити → Run

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  telegram_id text not null,
  telegram_username text,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists resumes_telegram_id_idx on public.resumes (telegram_id);

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

-- RLS: додаток працює через anon-ключ і сам фільтрує записи за telegram_id
-- (немає вбудованої Supabase-автентифікації), тож дозволяємо anon-ключу
-- читати й писати. Для продакшн-рівня безпеки додайте Supabase Auth
-- або перевірку telegram_id через Edge Function.
alter table public.resumes enable row level security;

drop policy if exists "anon full access" on public.resumes;
create policy "anon full access" on public.resumes
  for all
  to anon
  using (true)
  with check (true);
