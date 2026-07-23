import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { sendJson, methodNotAllowed, authenticate, logInfo } from "./_lib/respond.js";

// POST /api/vacancy-send — дзеркало /api/resume-send.js: надсилає
// користувачу в особисті повідомлення через бота (sendMessage) текст з
// прихованим у форматі Telegram HTML гіперпосиланням на повний перегляд
// вакансії всередині застосунку (startapp=v_<id>).
// Це навмисно НЕ публічний ендпоінт: chat_id береться з перевіреного
// initData (authenticate), а не з тіла запиту — інакше будь-хто міг би
// змусити бота писати довільним telegram_id.

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return sendJson(res, 500, { error: "server_misconfigured" });

  const admin = supabaseAdmin();
  const user = await authenticate(req, res, botToken, admin);
  if (!user) return;

  const { shareUrl, title, linkText, forwardLabel } = req.body || {};
  if (!shareUrl) {
    return sendJson(res, 400, { error: "missing_fields" });
  }

  const hiddenLink = `<a href="${escapeHtml(shareUrl)}">${escapeHtml(linkText || "")}</a>`;
  const text = [escapeHtml(title || ""), "", hiddenLink].filter(Boolean).join("\n").slice(0, 4096);

  // Кнопка "Поділитися" під повідомленням — відкриває стандартне вікно
  // пересилання Telegram (t.me/share/url) для цього ж посилання, тією
  // самою мовою застосунку, якою користувач ділився оригіналом.
  const forwardShareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title || "")}`;
  const replyMarkup = {
    inline_keyboard: [[{ text: forwardLabel || "Share", url: forwardShareUrl }]],
  };

  const form = new FormData();
  form.append("chat_id", String(user.id));
  form.append("text", text);
  form.append("parse_mode", "HTML");
  form.append("reply_markup", JSON.stringify(replyMarkup));

  let tgRes;
  try {
    tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      body: form,
    });
  } catch (err) {
    console.error("[vacancy-send] fetch failed", err);
    return sendJson(res, 502, { error: "telegram_unreachable" });
  }

  let tgJson = null;
  try {
    tgJson = await tgRes.json();
  } catch {
    tgJson = null;
  }

  if (!tgRes.ok || !tgJson?.ok) {
    // Найчастіша причина: користувач ще не писав боту / заблокував його —
    // Telegram повертає 403 "bot was blocked by the user" або
    // "chat not found". У цьому разі фронтенд показує підказку про те, що
    // треба дозволити повідомлення від бота.
    console.error("[vacancy-send] telegram error", { status: tgRes.status, body: tgJson });
    return sendJson(res, 502, {
      error: "telegram_send_failed",
      telegramDescription: tgJson?.description || null,
    });
  }

  logInfo("vacancy-send: sent", { telegramId: user.id });
  sendJson(res, 200, { ok: true });
}
