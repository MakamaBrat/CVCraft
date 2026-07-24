// Змініть на реальні дані вашого бота, якщо вони відрізняються.
export const TELEGRAM_BOT_USERNAME = "cvgramsbot";
export const TELEGRAM_MINI_APP_NAME = "Work";

export const MAX_RESUMES_PER_USER = 2;
export const MAX_VACANCIES_PER_USER = 5;

// Ціни в Telegram Stars
export const VACANCY_LISTING_PRICE_STARS = 500;
export const VACANCY_PRICE_PER_SHOW_STARS = 1;

// Два ключі Giphy — спочатку пробуємо ваш власний, і лише якщо він
// впав (ліміт вичерпано, ключ ще не активний тощо) — падаємо на публічний
// demo-ключ Giphy як запасний варіант, щоб кнопка "рандомна гіфка" не
// зламалась користувачу просто тому, що особистий ліміт скінчився.
//
// Вставте свій ключ з https://developers.giphy.com/dashboard/ сюди:
export const GIPHY_API_KEY = "ваш_ключ_сюди";

// Публічний demo-ключ Giphy — залишений як fallback навмисно, міняти не
// обов'язково (він спільний і теж обмежений, але це краще, ніж зовсім
// нічого не показати користувачу).
export const GIPHY_API_KEY_FALLBACK = "GlVGYHkr3WSBnllca54iNt0yFbjz7L65";

// Примітка: список адмінів більше НЕ читається на клієнті. Раніше тут був
// VITE_ADMIN_TELEGRAM_IDS + isAdmin() — але VITE_-змінні потрапляють у
// фронтенд-бандл і будь-хто міг їх побачити, а сама перевірка нічого не
// захищала (лише ховала кнопку в UI, тоді як запис у БД йшов з тим самим
// повноправним anon-ключем). Тепер адмінство перевіряється тільки сервером
// у /api/admin.js за ADMIN_TELEGRAM_IDS (без VITE_ префікса), і клієнт
// дізнається isAdmin: true/false у відповіді /api/auth-sync.

export function buildAppHomeLink() {
  return `https://t.me/${TELEGRAM_BOT_USERNAME}/${TELEGRAM_MINI_APP_NAME}`;
}

export function buildShareLink(resumeId) {
  return `https://t.me/${TELEGRAM_BOT_USERNAME}/${TELEGRAM_MINI_APP_NAME}?startapp=${resumeId}`;
}

export function buildVacancyShareLink(vacancyId) {
  return `https://t.me/${TELEGRAM_BOT_USERNAME}/${TELEGRAM_MINI_APP_NAME}?startapp=v_${vacancyId}`;
}
