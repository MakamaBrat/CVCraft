export function getTelegramWebApp() {
  return typeof window !== "undefined" ? window.Telegram?.WebApp : null;
}

// Returns { id, username, firstName, lastName, photoUrl } when the app is
// actually opened inside Telegram, or null otherwise (e.g. plain browser).
export function getTelegramUser() {
  const tg = getTelegramWebApp();
  const user = tg?.initDataUnsafe?.user;
  if (!user?.id) return null;
  return {
    id: String(user.id),
    username: user.username || "",
    firstName: user.first_name || "",
    lastName: user.last_name || "",
    photoUrl: user.photo_url || "",
  };
}

// Сирий, підписаний Telegram-ом рядок initData. Саме його, а не
// initDataUnsafe.user.id, треба довіряти для запитів до /api — сервер сам
// перераховує HMAC і лише тоді видає telegram_id, якому можна вірити.
export function getTelegramInitData() {
  const tg = getTelegramWebApp();
  return tg?.initData || null;
}

export function initTelegramApp() {
  const tg = getTelegramWebApp();
  if (!tg) return;
  tg.ready();
  tg.expand();
  try {
    tg.setHeaderColor("#0a0a12");
    tg.setBackgroundColor("#0a0a12");
  } catch {
    // older clients may not support these calls
  }
}
