import { apiFetch } from "./api.js";
import { alertDialog } from "./telegram.js";

// Надсилає посилання (на резюме/вакансію) користувачу в ЛС через бота
// (sendMessage). Використовується і для "поділитися" зі свого перегляду,
// і для "поділитися" резюме кандидата з екрана відгуків — логіка та сама.
//
// Якщо бот заблокований користувачем (або чат ще не існує — людина
// жодного разу не писала боту), Telegram повертає помилку, і бекенд
// віддає її як { error: "telegram_send_failed" }. РАНІШЕ в цьому випадку
// фронтенд мовчки підміняв дію стандартним вікном шерингу Telegram
// (t.me/share/url) — виглядало так, ніби замість очікуваної дії відкрилась
// зовсім інша. Тепер натомість одразу показуємо підказку поточною мовою
// застосунку про те, що потрібно дозволити боту надсилати повідомлення, і
// НЕ підміняємо дію фолбеком.
//
// Для решти помилок (мережа, сервер тимчасово недоступний тощо) поведінка
// не змінюється — викликач сам вирішує, чи падати у фолбек через
// t.me/share/url.
//
// Повертає "sent" | "blocked" | "fallback".
export async function sendLinkViaBot({ endpoint, shareUrl, title, linkText, forwardLabel, t }) {
  try {
    await apiFetch(endpoint, {
      method: "POST",
      body: { shareUrl, title, linkText, forwardLabel },
    });
    await alertDialog(t("share.sentToBot"));
    return "sent";
  } catch (err) {
    if (err?.payload?.error === "telegram_send_failed") {
      console.error("[shareSend] bot blocked/chat not found", err);
      await alertDialog(t("share.botBlocked"));
      return "blocked";
    }
    console.error("[shareSend] bot send failed, falling back", err);
    return "fallback";
  }
}
