import { logDbError, logInfo } from "./respond.js";

// Тримаємо ці константи тут окремо від src/lib/config.js: той файл — код
// фронтенду (import.meta.env і т.д.), а серверні функції збираються
// незалежно. Значення навмисно ті самі, що й у src/lib/config.js —
// якщо змінюєте бота/назву міні-аппу там, поміняйте і тут.
const TELEGRAM_BOT_USERNAME = "cvgramsbot";
const TELEGRAM_MINI_APP_NAME = "Work";

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildStartAppLink(startParam) {
  return `https://t.me/${TELEGRAM_BOT_USERNAME}/${TELEGRAM_MINI_APP_NAME}?startapp=${startParam}`;
}

// Низькорівнева відправка одного повідомлення через Bot API. Ніколи не
// кидає виключення назовні — виклики зі сторони "фонових" сповіщень
// (новий відгук, підходяща вакансія) не повинні зривати основний запит
// (створення відгуку, оплату тощо), навіть якщо бот заблокований юзером
// або Telegram тимчасово недоступний.
async function sendTelegramMessage(botToken, chatId, text, { linkUrl, linkText } = {}) {
  if (!botToken || !chatId) return { ok: false, description: "missing_token_or_chat" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: String(chatId),
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        ...(linkUrl
          ? { reply_markup: { inline_keyboard: [[{ text: linkText || "Відкрити", url: linkUrl }]] } }
          : {}),
      }),
    });
    const json = await res.json().catch(() => null);
    if (!json?.ok) {
      logInfo("telegramNotify: send failed", { chatId, description: json?.description });
      return { ok: false, description: json?.description || "telegram_error" };
    }
    return { ok: true };
  } catch (err) {
    console.error("[telegramNotify] fetch failed", err);
    return { ok: false, description: "network_error" };
  }
}

// Сповіщає власника вакансії про новий відгук. Викликається з
// /api/vacancy-apply.js одразу після успішного insert у vacancy_applications.
export async function notifyVacancyOwnerAboutApplication(botToken, vacancy) {
  const position = vacancy?.data?.position?.trim() || "вакансію";
  const text = `📩 На вашу вакансію «${escapeHtml(position)}» новий відгук.`;
  const link = buildStartAppLink(`ap_${vacancy.id}`);
  await sendTelegramMessage(botToken, vacancy.telegram_id, text, {
    linkUrl: link,
    linkText: "Переглянути відгуки",
  });
}

// Розсилає повідомлення про щойно опубліковану вакансію всім підписникам
// збережених пошуків (vacancy_search_subscriptions), чий фільтр їй
// відповідає. Викликається лише в момент, коли вакансія вперше стає
// "active" (перша успішна оплата розміщення) — з /api/vacancy-invoice.js
// (безкоштовний грант) і /api/bot.js (successful_payment).
export async function notifyMatchingSubscribers(admin, botToken, vacancy) {
  if (!botToken) return;

  const { data: subs, error } = await admin
    .from("vacancy_search_subscriptions")
    .select("id, telegram_id, query, city");
  if (error) {
    logDbError("notifyMatchingSubscribers: list", error, { vacancyId: vacancy.id });
    return;
  }
  if (!subs || subs.length === 0) return;

  const d = vacancy.data || {};
  const haystack = [d.position, d.company, d.city, d.salary, d.employmentType, d.description, d.requirements, ...(d.tags || [])]
    .filter(Boolean)
    .join(" \u2022 ")
    .toLowerCase();
  const vacancyCity = (d.city || "").trim().toLowerCase();

  const matched = subs.filter((s) => {
    if (s.city && s.city.trim().toLowerCase() !== vacancyCity) return false;
    const terms = String(s.query || "")
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);
    if (terms.length === 0) return true;
    return terms.every((term) => haystack.includes(term));
  });
  if (matched.length === 0) return;

  const position = d.position?.trim() || "Нова вакансія";
  const company = d.company?.trim();
  const text = `🔔 Нова вакансія за вашим збереженим пошуком:\n<b>${escapeHtml(position)}</b>${
    company ? ` — ${escapeHtml(company)}` : ""
  }`;
  const link = buildStartAppLink(`v_${vacancy.id}`);

  await Promise.all(
    matched.map((s) =>
      sendTelegramMessage(botToken, s.telegram_id, text, { linkUrl: link, linkText: "Дивитись вакансію" })
    )
  );

  logInfo("notifyMatchingSubscribers: done", { vacancyId: vacancy.id, matched: matched.length });
}
