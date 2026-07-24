import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { sendJson, methodNotAllowed, authenticate, logDbError, logInfo } from "./_lib/respond.js";
import { getCurrentPricing } from "./_lib/pricing.js";
import { applyVacancyPayment } from "./_lib/applyVacancyPayment.js";
import { notifyMatchingSubscribers } from "./_lib/telegramNotify.js";

// POST /api/vacancy-invoice
// body: { id: vacancyId, kind: "listing" | "extend" | "top", weeks: number }
//   weeks — кількість тижневих періодів оплати (назва поля weeks збережена
//   для сумісності з payload/DB, оплата рахується щотижня).
//   listing — перша публікація на N тижнів (тільки зі статусу approved)
//   extend  — продовження звичайного розміщення ще на N тижнів
//   top     — купівля/продовження топ-розміщення ще на N тижнів
//
// Створює Telegram Stars invoice-link через Bot API (createInvoiceLink,
// currency "XTR") і повертає його клієнту. Клієнт відкриває посилання
// через tg.openInvoice(...). Фактичне продовження дат (expires_at /
// top_until) і активація вакансії відбувається у /api/bot.js по вебхуку
// successful_payment — НІКОЛИ не довіряємо факту оплати з фронтенду напряму.
export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const admin = supabaseAdmin();
  const user = await authenticate(req, res, botToken, admin);
  if (!user) return;

  const { id, kind, weeks } = req.body || {};
  if (!id || !["listing", "extend", "top"].includes(kind)) {
    return sendJson(res, 400, { error: "invalid_body" });
  }
  const periodsCount = Number.isFinite(weeks) ? Math.floor(weeks) : 0;
  if (periodsCount < 1 || periodsCount > 100) {
    return sendJson(res, 400, { error: "invalid_weeks" });
  }

  const { data: vacancy, error: fetchError } = await admin
    .from("vacancies")
    .select("id, telegram_id, status, data")
    .eq("id", id)
    .eq("telegram_id", user.id)
    .maybeSingle();

  if (fetchError) {
    logDbError("vacancy-invoice: lookup", fetchError, { telegramId: user.id, id });
    return sendJson(res, 500, { error: "db_error" });
  }
  if (!vacancy) return sendJson(res, 404, { error: "not_found" });

  if (kind === "listing" && vacancy.status !== "approved") {
    return sendJson(res, 409, { error: "invalid_status" });
  }
  if (["extend", "top"].includes(kind) && !["active", "paused"].includes(vacancy.status)) {
    return sendJson(res, 409, { error: "invalid_status" });
  }

  const { listingPrice, topPrice } = await getCurrentPricing(admin);
  const pricePerPeriod = kind === "top" ? topPrice : listingPrice;
  const totalStars = periodsCount * pricePerPeriod;

  // Якщо ціна (звичайного розміщення або топу) виставлена як 0 ⭐ — це
  // означає "безкоштовно". У такому разі інвойс через Telegram не
  // потрібен і навіть неможливий (Bot API не дозволяє суму 0): одразу
  // застосовуємо продовження/активацію так само, як це робить
  // successful_payment у /api/bot.js, і повертаємо клієнту { free: true },
  // щоб він не намагався відкривати tg.openInvoice.
  if (totalStars <= 0) {
    const result = await applyVacancyPayment(admin, {
      vacancy,
      kind,
      periods: periodsCount,
      telegramId: user.id,
      starsAmount: 0,
      chargeId: null,
    });
    if (!result.ok) return sendJson(res, 500, { error: "db_error" });
    logInfo("vacancy-invoice: granted free", { telegramId: user.id, id, kind, periodsCount });

    // "listing" — це перша публікація (approved -> active). Саме зараз
    // вакансія вперше стає видимою в публічному пошуку, тож розсилаємо
    // підписникам збережених фільтрів, яким вона відповідає.
    if (kind === "listing") {
      notifyMatchingSubscribers(admin, botToken, vacancy).catch((err) =>
        console.error("[vacancy-invoice] subscriber notification failed", err)
      );
    }

    return sendJson(res, 200, { free: true, totalStars: 0 });
  }

  if (!botToken) {
    console.error("[vacancy-invoice] TELEGRAM_BOT_TOKEN is not set");
    return sendJson(res, 500, { error: "server_misconfigured" });
  }

  // payload: доступний назад незмінним у successful_payment.invoice_payload —
  // Telegram сам його переносить, клієнт не може підмінити. Обмеження 128 байт.
  const payload = JSON.stringify({ v: vacancy.id, k: kind, w: periodsCount, t: user.id });
  if (payload.length > 128) return sendJson(res, 400, { error: "payload_too_long" });

  const titles = {
    listing: "Публікація вакансії",
    extend: "Продовження показу",
    top: "Топ-розміщення",
  };
  const title = titles[kind];
  const position = vacancy.data?.position || "Вакансія";
  const weeksLabel = periodsCount === 1 ? "1 тиждень" : `${periodsCount} тижні(в)`;
  const descriptions = {
    listing: `Публікація "${position}" на ${weeksLabel}`,
    extend: `Продовження показу "${position}" на ${weeksLabel}`,
    top: `Топ-розміщення "${position}" на ${weeksLabel}`,
  };
  const description = descriptions[kind].slice(0, 255);

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.slice(0, 32),
        description,
        payload,
        currency: "XTR",
        prices: [{ label: title.slice(0, 32), amount: totalStars }],
      }),
    });
    const tgJson = await tgRes.json();
    if (!tgJson.ok) {
      console.error("[vacancy-invoice] createInvoiceLink failed", tgJson);
      return sendJson(res, 502, { error: "telegram_error", details: tgJson.description });
    }
    logInfo("vacancy-invoice: created", { telegramId: user.id, id, kind, periodsCount, totalStars });
    return sendJson(res, 200, { invoiceLink: tgJson.result, totalStars });
  } catch (err) {
    console.error("[vacancy-invoice] request failed", err);
    return sendJson(res, 500, { error: "internal_error" });
  }
}
