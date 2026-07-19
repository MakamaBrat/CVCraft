# CV DECK

Мобільний веб-застосунок для створення резюме: майстер заповнення даних, портфоліо з відео/гіфками, вибір шаблону, попередній перегляд, PDF-експорт і публічне посилання на резюме через Telegram. Кожен користувач Telegram може мати **максимум 2 резюме**.

## 1. Налаштування Supabase

1. Створіть проєкт на [supabase.com](https://supabase.com).
2. Відкрийте **SQL Editor → New query**, вставте вміст файлу `supabase/schema.sql` і натисніть **Run**. Це створить дві таблиці:
   - `users` — telegram_id, telegram_username, first_name
   - `resumes` — id, telegram_id (посилання на users), data (jsonb), updated_at
   
   Ліміт у 2 резюме на користувача забезпечується тригером бази даних (`resumes_limit_check`), тож обійти його неможливо навіть напряму через API.
3. Перейдіть у **Project Settings → API** і скопіюйте:
   - `Project URL`
   - `service_role` ключ (Settings → API → Project API keys → `service_role`, **секретний**, використовується тільки серверним кодом у `/api`)
4. Виконайте по черзі решту файлів з `supabase/` (`migration_02_vacancies.sql`, `migration_03_applications_resume.sql`, `migration_04_security_hardening.sql`) — останній закриває прямий запис/читання в БД для anon-ключа: усі write-операції та приватні read-операції відтепер йдуть через `/api/*`, які самі перевіряють підпис Telegram `initData` і пишуть у базу вже через `service_role`.

## 2. Налаштування бота і посилань

У файлі `src/lib/config.js` вкажіть реальні дані вашого бота:

```js
export const TELEGRAM_BOT_USERNAME = "cvdeckbot";
export const TELEGRAM_MINI_APP_NAME = "Work";
```

Кнопка «Поділитись резюме» генерує посилання у форматі:

```
https://t.me/cvdeckbot/Work?startapp=<id_резюме>
```

Перехід за таким посиланням відкриває застосунок як Mini App і одразу показує конкретне резюме (з відтворенням відео/гіфок з портфоліо), без входу.

## 3. Локальний запуск

```bash
cp .env.example .env
# вставте свої значення VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
# TELEGRAM_BOT_TOKEN і ADMIN_TELEGRAM_IDS у .env
npm install
npm run dev
```

Якщо змінні не вказані, застосунок автоматично працює в офлайн-режимі (дані лише в localStorage браузера, ліміт у 2 резюме теж діє, але тільки на клієнті). Локальні `/api`-функції піднімаються через `vercel dev`, звичайний `vite dev` їх не обслуговує.

## 4. Деплой на Vercel

1. Завантажте цю папку на GitHub.
2. На vercel.com → **Add New → Project** → оберіть репозиторій.
3. У розділі **Environment Variables** додайте:
   - `VITE_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `PUBLIC_APP_URL`
   - `ADMIN_TELEGRAM_IDS`
4. Натисніть **Deploy**.

## 5. Підключення як Telegram Mini App

1. У [@BotFather](https://t.me/BotFather) створіть бота (`/newbot`), якщо ще немає.
2. Команда `/newapp` → оберіть бота → вкажіть назву застосунку **точно як у `TELEGRAM_MINI_APP_NAME`** (за замовчуванням `Work`), опис, іконку та **URL вашого застосунку на Vercel**.
3. Готово: посилання `https://t.me/<бот>/<назва_застосунку>` відкриває CV DECK прямо в Telegram.
4. При відкритті застосунок сам зчитує ID, нікнейм і ім'я користувача з Telegram — окремий вхід не потрібен. Якщо застосунок відкрито у звичайному браузері (не в Telegram), з'явиться форма ручного введення — це лише для тестування.



- **Вхід**: усередині Telegram застосунок автоматично зчитує ваш Telegram ID, нікнейм та ім'я через Telegram Web App SDK — без пароля, без форми. Поза Telegram показується форма ручного введення (для розробки/тестування).
- **Резюме** зберігаються в таблиці `resumes` у Supabase, прив'язані до `telegram_id`.
- **Поділитись резюме**: на екрані перегляду є кнопка "Поділитись резюме" — вона копіює посилання виду `https://ваш-домен.vercel.app/#/r/<id>`. За цим посиланням будь-хто відкриває застосунок одразу з переглядом конкретного резюме, включно з відтворенням відео та гіфок з портфоліо — без входу через Telegram.
- **Тема**: застосунок повністю темний (фон `#0a0a12`, фіолетовий акцент), включно з екраном публічного перегляду.

## 6. Кнопка "Start" у боті

Файл `api/bot.js` — серверна функція Vercel, яка обробляє команду `/start` і надсилає повідомлення з кнопкою **Start**, що відкриває CV DECK як Mini App. Деплоїться разом з рештою застосунку автоматично.

1. У Vercel → **Settings → Environment Variables** додайте:
   - `TELEGRAM_BOT_TOKEN` — токен бота від @BotFather
   - `PUBLIC_APP_URL` — публічна адреса застосунку, напр. `https://cvcraft.vercel.app`
2. Задеплойте (або перезадеплойте) проєкт.
3. Зареєструйте вебхук одноразовим запитом (підставте свій токен і домен):

   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<ваш-домен>/api/bot"
   ```

4. Напишіть боту `/start` у Telegram — з'явиться повідомлення з кнопкою **Start**, натискання на яку відкриває застосунок.

Якщо перейти за посиланням `t.me/<бот>?start=<id_резюме>`, кнопка одразу відкриє саме це резюме.

## Стек

- React 18 + Vite
- Tailwind CSS
- Supabase (Postgres + анонімний ключ, без окремого бекенду)
