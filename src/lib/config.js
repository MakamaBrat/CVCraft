// Змініть на реальні дані вашого бота, якщо вони відрізняються.
export const TELEGRAM_BOT_USERNAME = "cvdeckbot";
export const TELEGRAM_MINI_APP_NAME = "Work";

export const MAX_RESUMES_PER_USER = 2;
export const MAX_VACANCIES_PER_USER = 5;

// Ціни в Telegram Stars
export const VACANCY_LISTING_PRICE_STARS = 500;
export const VACANCY_PRICE_PER_SHOW_STARS = 1;

// Список Telegram ID адмінів, кома-розділений рядок у env (Vercel):
// ADMIN_TELEGRAM_IDS=111111111,222222222
export const ADMIN_TELEGRAM_IDS = String(import.meta.env.VITE_ADMIN_TELEGRAM_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function isAdmin(telegramId) {
  return !!telegramId && ADMIN_TELEGRAM_IDS.includes(String(telegramId));
}

export function buildShareLink(resumeId) {
  return `https://t.me/${TELEGRAM_BOT_USERNAME}/${TELEGRAM_MINI_APP_NAME}?startapp=${resumeId}`;
}

export function buildVacancyShareLink(vacancyId) {
  return `https://t.me/${TELEGRAM_BOT_USERNAME}/${TELEGRAM_MINI_APP_NAME}?startapp=v_${vacancyId}`;
}
