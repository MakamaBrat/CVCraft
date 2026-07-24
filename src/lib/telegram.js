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
    // Bot API 8.0+. Прибирає верхню "шапку" застосунку — контент іде під
    // самий зріз екрана, а кнопки "Закрити"/"▾"/"•••" Telegram малює
    // напівпрозоро ПОВЕРХ контенту. Відступ під них рахує
    // watchTelegramSafeArea() нижче. Старі клієнти просто не мають цього
    // методу — try/catch, щоб не падати.
    tg.requestFullscreen?.();
  } catch {
    // older clients may not support fullscreen
  }
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

// --- Fullscreen safe area -------------------------------------------
// У fullscreen-режимі (requestFullscreen вище) нативного хедера більше
// нема, і Telegram малює свої контроли ("Закрити", "▾", "•••") просто
// поверх верху сторінки. Розмір цієї зони віддають два поля WebApp:
//   - safeAreaInset        — відступ під "залізо" пристрою (notch/статусбар);
//   - contentSafeAreaInset — додатковий відступ саме під панель Telegram.
// Сума йде в CSS-змінну --tg-safe-area-top на <html>; PageBackground.jsx
// підставляє її як paddingTop, тож усі екрани отримують правильний
// відступ автоматично, без правок у кожному з них. Поза fullscreen
// (звичайний expand()) або поза Telegram відступ — 0, бо там місце під
// хедер лишає сам клієнт.
function computeTopInset(tg) {
  if (!tg?.isFullscreen) return 0;
  const device = tg.safeAreaInset?.top || 0;
  const chrome = tg.contentSafeAreaInset?.top || 0;
  return device + chrome;
}

function applyTopInset(tg) {
  document.documentElement.style.setProperty("--tg-safe-area-top", `${computeTopInset(tg)}px`);
}

// Підписує --tg-safe-area-top на зміни (вхід/вихід із fullscreen, поворот
// екрана, різні пристрої). Викликати один раз в App.jsx; повертає функцію
// відписки для cleanup у useEffect.
export function watchTelegramSafeArea() {
  const tg = getTelegramWebApp();
  if (!tg) return () => {};
  applyTopInset(tg);
  const handler = () => applyTopInset(tg);
  tg.onEvent?.("fullscreenChanged", handler);
  tg.onEvent?.("safeAreaChanged", handler);
  tg.onEvent?.("contentSafeAreaChanged", handler);
  return () => {
    tg.offEvent?.("fullscreenChanged", handler);
    tg.offEvent?.("safeAreaChanged", handler);
    tg.offEvent?.("contentSafeAreaChanged", handler);
  };
}
