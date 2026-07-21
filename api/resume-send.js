import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { sendJson, methodNotAllowed, authenticate, logInfo } from "./_lib/respond.js";

// POST /api/resume-send — приймає вже згенерований на клієнті PDF (base64) і
// пересилає його користувачу в особисті повідомлення через бота
// (sendDocument), замість того щоб примушувати завантажувати файл у браузері.
// Це навмисно НЕ публічний ендпоінт: chat_id береться з перевіреного
// initData (authenticate), а не з тіла запиту — інакше будь-хто міг би
// змусити бота писати довільним telegram_id.
//
// Підпис до документа містить приховане у форматі Telegram HTML
// гіперпосилання на повний перегляд резюме (з усіма файлами — відео/гіфки,
// які в сам PDF не потрапляють).

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

  const { pdfBase64, fileName, shareUrl, caption: rawCaption, title } = req.body || {};
  if (!pdfBase64 || !fileName || !shareUrl) {
    return sendJson(res, 400, { error: "missing_fields" });
  }
  // ~5MB зверху — з запасом (Telegram Bot API дозволяє до 50MB для
  // sendDocument, але наші PDF ніколи не мають бути такими важкими; це
  // просто запобіжник від помилково величезного payload).
  if (pdfBase64.length > 7_000_000) {
    return sendJson(res, 400, { error: "file_too_large" });
  }

  const linkText = "Натисніть, щоб побачити резюме з усіма файлами";
  const hiddenLink = `<a href="${escapeHtml(shareUrl)}">${escapeHtml(linkText)}</a>`;
  const caption = [escapeHtml(rawCaption || title || ""), "", hiddenLink].filter(Boolean).join("\n").slice(0, 1024);

  const buffer = Buffer.from(pdfBase64, "base64");

  const form = new FormData();
  form.append("chat_id", String(user.id));
  form.append("caption", caption);
  form.append("parse_mode", "HTML");
  form.append("document", new Blob([buffer], { type: "application/pdf" }), fileName);

  let tgRes;
  try {
    tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
      method: "POST",
      body: form,
    });
  } catch (err) {
    console.error("[resume-send] fetch failed", err);
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
    console.error("[resume-send] telegram error", { status: tgRes.status, body: tgJson });
    return sendJson(res, 502, {
      error: "telegram_send_failed",
      telegramDescription: tgJson?.description || null,
    });
  }

  logInfo("resume-send: sent", { telegramId: user.id, fileName });
  sendJson(res, 200, { ok: true });
}
