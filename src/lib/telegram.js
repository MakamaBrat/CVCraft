import { requestInAppConfirm } from "./confirmStore.js";

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

// Підтвердження дії. РАНІШЕ тут спершу пробувався нативний
// tg.showPopup()/tg.showConfirm(), а власна модалка була лише фолбеком поза
// Telegram, з 4-секундним таймером-запобіжником на випадок "мертвого"
// callback. На практиці навіть цей запобіжник не рятував: усередині
// Telegram Mini App showPopup на частині клієнтів не викликає callback
// ВЗАГАЛІ і не кидає помилку — кнопка виглядала мертвою.
//
// Тепер підтвердження ЗАВЖДИ йде через власну React-модалку (ConfirmModal,
// змонтована в App.jsx), незалежно від того, чи є tg. Вона не залежить від
// версії клієнта Telegram і гарантовано резолвиться, щойно користувач
// натисне кнопку — без гри в вгадування, яке саме нативне API підтримує
// поточний клієнт.
export function confirmDialog(message) {
  return requestInAppConfirm(message);
}

export function alertDialog(message) {
  return new Promise((resolve) => {
    const tg = getTelegramWebApp();
    if (tg?.showAlert) {
      tg.showAlert(message, () => resolve());
    } else {
      window.alert(message);
      resolve();
    }
  });
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
  try {
    if (tg.disableVerticalSwipes) {
      tg.disableVerticalSwipes();
    }
  } catch {
    // older clients may not support this call
  }
}
