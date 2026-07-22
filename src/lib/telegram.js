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

export function confirmDialog(message) {
  return new Promise((resolve) => {
    const tg = getTelegramWebApp();
    // showPopup — найнадійніший варіант: showConfirm на деяких клієнтах
    // (особливо старі версії Telegram Desktop/iOS) не викликає callback
    // взагалі, а window.confirm() у WebView Telegram нерідко мовчки
    // блокується без будь-якого видимого діалогу — тоді кнопка виглядає
    // так, ніби натискання не дало жодного ефекту.
    if (tg?.showPopup) {
      tg.showPopup(
        {
          message,
          buttons: [
            { id: "cancel", type: "cancel" },
            { id: "ok", type: "ok", text: "OK" },
          ],
        },
        (buttonId) => resolve(buttonId === "ok")
      );
    } else if (tg?.showConfirm) {
      tg.showConfirm(message, (ok) => resolve(Boolean(ok)));
    } else if (tg) {
      // Ми точно в Telegram, але клієнт зовсім старий і не підтримує
      // жодного нативного діалогу підтвердження. window.confirm тут
      // ненадійний (може мовчки нічого не показати), тож краще пропустити
      // підтвердження, ніж дати кнопці виглядати "мертвою".
      resolve(true);
    } else {
      resolve(window.confirm(message));
    }
  });
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