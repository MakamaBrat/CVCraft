import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { sendJson, methodNotAllowed, authenticate, logDbError, logInfo } from "./_lib/respond.js";

// POST /api/vacancy-invoice
// body: { id: vacancyId, kind: "listing" | "extra_shows", shows: number }
//
// Створює Telegram Stars invoice-link через Bot API (createInvoiceLink,
// currency "XTR") і повертає його клієнту. Клієнт відкриває посилання
// через tg.openInvoice(...). Фактичне зарахування показів/активація
// вакансії відбувається у /api/bot.js по вебхуку successful_payment —
// НІКОЛИ не довіряємо факту оплати з фронтенду напряму.
export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const admin = supabaseAdmin();
  const user = await authenticate(req, res, botToken, admin);
  if (!user) return;

  const { id, kind, shows } = req.body || {};
  if (!id || !["listing", "extra_shows"].includes(kind)) {
    return sendJson(res, 400, { error: "invalid_body" });
  }
  const showsCount = Number.isFinite(shows) ? Math.floor(shows) : 0;
  if (showsCount < 1 || showsCount > 100000) {
    return sendJson(res, 400, { error: "invalid_shows" });
  }

  const { data: vacancy, error: fetchError } = await admin
    .from("vacancies")
    .select("id, telegram_id, status, listing_price, price_per_show, data")
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
  if (kind === "extra_shows" && !["active", "paused"].includes(vacancy.status)) {
    return sendJson(res, 409, { error: "invalid_status" });
  }

  const perShow = vacancy.price_per_show || 1;
  const listingFee = kind === "listing" ? vacancy.listing_price || 0 : 0;
  const totalStars = listingFee + showsCount * perShow;
  if (totalStars < 1) return sendJson(res, 400, { error: "invalid_amount" });

  if (!botToken) {
    console.error("[vacancy-invoice] TELEGRAM_BOT_TOKEN is not set");
    return sendJson(res, 500, { error: "server_misconfigured" });
  }

  // payload: доступний назад незмінним у successful_payment.invoice_payload —
  // Telegram сам його переносить, клієнт не може підмінити. Обмеження 128 байт.
  const payload = JSON.stringify({ v: vacancy.id, k: kind, s: showsCount, t: user.id });
  if (payload.length > 128) return sendJson(res, 400, { error: "payload_too_long" });

  const title = kind === "listing" ? "Публікація вакансії" : "Докупівля показів";
  const position = vacancy.data?.position || "Вакансія";
  const description =
    kind === "listing"
      ? `Публікація "${position}" + ${showsCount} показ(ів)`.slice(0, 255)
      : `+${showsCount} показ(ів) для "${position}"`.slice(0, 255);

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
    logInfo("vacancy-invoice: created", { telegramId: user.id, id, kind, showsCount, totalStars });
    return sendJson(res, 200, { invoiceLink: tgJson.result, totalStars });
  } catch (err) {
    console.error("[vacancy-invoice] request failed", err);
    return sendJson(res, 500, { error: "internal_error" });
  }
}
