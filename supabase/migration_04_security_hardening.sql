-- CVCraft — міграція №4: закриття анонімного запису в базу
-- Виконати ПІСЛЯ migration_03_applications_resume.sql. Ідемпотентно.
--
-- Проблема, яку закриває ця міграція:
-- До цього anon-ключ (він лежить у фронтенд-бандлі, кожен може його побачити
-- через devtools) мав `for all ... using (true) with check (true)` —
-- тобто будь-хто міг напряму через supabase-js писати що завгодно:
-- позначати вакансії is_paid = true, накручувати shows_purchased,
-- банити/розбанювати users, self-approve вакансії, читати чужі резюме тощо.
--
-- Рішення: anon більше не отримує права писати в жодну з таблиць і читати
-- приватні дані. Усі write-операції та приватні read-операції йдуть через
-- Vercel serverless-функції (/api/*), які самі перевіряють Telegram
-- initData (HMAC-підпис) і виконують запити вже через service-role ключ
-- (SUPABASE_SERVICE_ROLE_KEY), який ніколи не потрапляє у фронтенд.
-- service-role повністю обходить RLS, тож для нього окремі policy не потрібні.

-- ── users: анон більше нічого не пише і не читає напряму ───────────────────
drop policy if exists "anon full access" on public.users;
-- жодної policy для anon не залишаємо => anon не має доступу зовсім
-- (RLS увімкнено, policy немає => deny by default)

-- ── resumes: приватні дані, анон не читає і не пише напряму ────────────────
drop policy if exists "anon full access" on public.resumes;
-- Публічний перегляд конкретного резюме за посиланням (share-функція)
-- йде через /api/resume-share.js під service-role, а не напряму з клієнта,
-- щоб не віддавати весь рядок (тільки потрібні поля) і мати контроль/лічильники.

-- ── vacancies: публічно можна читати ТІЛЬКИ активні оголошення ─────────────
drop policy if exists "anon full access" on public.vacancies;
create policy "anon read active vacancies" on public.vacancies
  for select
  to anon
  using (status = 'active');
-- insert/update/delete для anon відсутні => чернетки, модерація, оплата,
-- лічильники показів — усе тільки через service-role API.

-- ── vacancy_payments: фінансові дані, анон не має доступу взагалі ──────────
drop policy if exists "anon full access" on public.vacancy_payments;

-- ── vacancy_applications: відгуки з персональними даними кандидатів ────────
drop policy if exists "anon full access" on public.vacancy_applications;

-- ── прибираємо зайві table-grants для anon окремо від RLS ──────────────────
-- RLS фільтрує рядки, але на всяк випадок явно забираємо права на запис
-- на рівні grants, щоб навіть майбутня policy-помилка не відкрила запис.
revoke insert, update, delete on public.users from anon;
revoke insert, update, delete on public.resumes from anon;
revoke select on public.resumes from anon;
revoke insert, update, delete on public.vacancies from anon;
revoke all on public.vacancy_payments from anon;
revoke all on public.vacancy_applications from anon;

-- vacancy_payments/vacancy_applications: жодних anon-прав навіть на select
revoke select on public.vacancy_payments from anon;
revoke select on public.vacancy_applications from anon;

-- register_vacancy_show раніше викликався з клієнта (supabase.rpc) —
-- тепер це робить лише service-role з /api/vacancy-view.js.
revoke execute on function public.register_vacancy_show(uuid) from anon;

-- Примітка: authenticated-роль тут не використовується (немає Supabase Auth),
-- тож окремих policy для неї не додаємо.
