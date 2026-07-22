// Дозволяє звичайному (не-React) коду — confirmDialog() у telegram.js —
// попросити React показати власну модалку підтвердження замість
// нативного window.confirm(), який мовчки блокується в sandboxed iframe
// (наприклад, у прев'ю-режимах розробки) без жодного видимого діалогу.
//
// ConfirmModal.jsx монтується один раз у корені застосунку і реєструє тут
// свій обробник; confirmDialog() лише кличе requestInAppConfirm(message) і
// чекає, поки користувач натисне одну з кнопок у модалці.

let handler = null;

export function registerConfirmHost(fn) {
  handler = fn;
  return () => {
    if (handler === fn) handler = null;
  };
}

export function requestInAppConfirm(message) {
  if (!handler) {
    // Хост ще не змонтований — не мало б статись, якщо <ConfirmModal /> є
    // в App.jsx, але якщо все ж так: краще пропустити підтвердження і
    // дозволити дію (наприклад, вихід з екрана), ніж мовчки заблокувати
    // користувача назавжди. "Не показали попередження" — прикро, але
    // "неможливо вийти з екрана" — набагато гірше.
    console.error("[confirmStore] no ConfirmModal host mounted — auto-confirming to avoid trapping the user");
    return Promise.resolve(true);
  }
  return handler(message);
}
