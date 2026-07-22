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

export function confirmDialog(message) {
  return new Promise((resolve) => {
    const tg = getTelegramWebApp();
    let settled = false;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    // Захист від "мертвих" кнопок: на деяких клієнтах Telegram
    // (особливо старі версії Desktop/iOS) showPopup/showConfirm не кидають
    // помилку, але й ніколи не викликають callback — Promise висить вічно,
    // і кнопка виглядає так, ніби натискання взагалі нічого не дало.
    // Якщо за 4с відповіді нема — вважаємо дію підтвердженою і йдемо далі,
    // аби інтерфейс не зависав намертво.
    const timer = setTimeout(() => settle(true), 4000);

    // showPopup — найнадійніший варіант: showConfirm на деяких клієнтах
    // (особливо старі версії Telegram Desktop/iOS) не викликає callback
    // взагалі, а window.confirm() у WebView Telegram нерідко мовчки
    // блокується без будь-якого видимого діалогу — тоді кнопка виглядає
    // так, ніби натискання не дало жодного ефекту.
    if (tg?.showPopup) {
      try {
        tg.showPopup(
          {
            message,
            buttons: [
              { id: "cancel", type: "cancel" },
              // type "ok"/"cancel" мають фіксований підпис — Telegram
              // відхиляє (кидає виняток) спробу передати їм свій "text".
              { id: "ok", type: "ok" },
            ],
          },
          (buttonId) => settle(buttonId === "ok")
        );
      } catch {
        // Будь-яка неочікувана помилка нативного API не має "з'їдати"
        // натискання кнопки мовчки — пробуємо наступний доступний варіант.
        if (tg?.showConfirm) tg.showConfirm(message, (ok) => settle(Boolean(ok)));
        else settle(true);
      }
    } else if (tg?.showConfirm) {
      tg.showConfirm(message, (ok) => settle(Boolean(ok)));
    } else if (tg) {
      // Ми точно в Telegram, але клієнт зовсім старий і не підтримує
      // жодного нативного діалогу підтвердження. window.confirm тут
      // ненадійний (може мовчки нічого не показати), тож краще пропустити
      // підтвердження, ніж дати кнопці виглядати "мертвою".
      settle(true);
    } else {
      // Поза Telegram (звичайний браузер, dev-прев'ю, sandboxed iframe)
      // window.confirm() ненадійний: у sandboxed iframe без дозволу
      // allow-modals він мовчки повертає false БЕЗ жодного видимого вікна
      // і без помилки в консолі — саме тому кнопка виглядала "мертвою".
      // Власна React-модалка (ConfirmModal, змонтована в App.jsx) завжди
      // видима незалежно від контексту показу застосунку.
      //
      // 4-секундний timer вище — це запобіжник саме проти "мертвих"
      // колбеків нативного Telegram API; на нашу ж модалку він не
      // повинен діяти, бо вона рано чи пізно точно зарезолвиться сама
      // (коли користувач натисне кнопку) — інакше вибір "Скасувати",
      // зроблений через 4+ секунди роздумів, буде тихо проігнорований.
      clearTimeout(timer);
      requestInAppConfirm(message).then(settle);
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