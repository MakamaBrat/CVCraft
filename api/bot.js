// Vercel serverless function: обробляє вебхук Telegram-бота.
// На команду /start надсилає повідомлення з кнопкою "Start", яка
// відкриває CV DECK як Telegram Mini App.
//
// Також обробляє оплату Telegram Stars за вакансії:
//   pre_checkout_query   — обов'язково відповісти протягом 10с (answerPreCheckoutQuery)
//   message.successful_payment — тут і тільки тут зараховуємо оплату в БД
//
// Налаштування (Vercel → Settings → Environment Variables):
//   TELEGRAM_BOT_TOKEN  — токен бота від @BotFather
//   PUBLIC_APP_URL      — https-адреса цього застосунку, напр. https://cvcraft.vercel.app
//
// Після деплою один раз зареєструйте вебхук (див. README, розділ 6):
//   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<ваш-домен>/api/bot"

import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { logDbError, logInfo } from "./_lib/respond.js";
import { applyVacancyPayment } from "./_lib/applyVacancyPayment.js";

async function answerPreCheckoutQuery(token, preCheckoutQueryId, ok, errorMessage) {
  await fetch(`https://api.telegram.org/bot${token}/answerPreCheckoutQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pre_checkout_query_id: preCheckoutQueryId,
      ok,
      ...(errorMessage ? { error_message: errorMessage } : {}),
    }),
  });
}

async function handlePreCheckoutQuery(query, token) {
  // Стисла ревалідація перед списанням: вакансія все ще існує і в
  // статусі, що дозволяє цей тип оплати. Це не гарантія від гонки умов,
  // але фінальна істина все одно перевіряється ще раз у successful_payment.
  let payload;
  try {
    payload = JSON.parse(query.invoice_payload || "");
  } catch {
    payload = null;
  }
  if (!payload?.v || !payload?.k) {
    await answerPreCheckoutQuery(token, query.id, false, "Некоректний платіж.");
    return;
  }

  const admin = supabaseAdmin();
  const { data: vacancy, error } = await admin
    .from("vacancies")
    .select("id, status, telegram_id")
    .eq("id", payload.v)
    .maybeSingle();

  if (error) {
    logDbError("bot: pre_checkout_query lookup", error, { vacancyId: payload.v });
    await answerPreCheckoutQuery(token, query.id, false, "Технічна помилка, спробуйте пізніше.");
    return;
  }
  if (!vacancy || String(vacancy.telegram_id) !== String(payload.t)) {
    await answerPreCheckoutQuery(token, query.id, false, "Вакансію не знайдено.");
    return;
  }
  if (payload.k === "listing" && vacancy.status !== "approved") {
    await answerPreCheckoutQuery(token, query.id, false, "Вакансія вже не очікує оплати.");
    return;
  }
  if (["extend", "top"].includes(payload.k) && !["active", "paused"].includes(vacancy.status)) {
    await answerPreCheckoutQuery(token, query.id, false, "Вакансію не можна продовжити зараз.");
    return;
  }

  await answerPreCheckoutQuery(token, query.id, true);
}

async function handleSuccessfulPayment(message) {
  const sp = message.successful_payment;
  let payload;
  try {
    payload = JSON.parse(sp.invoice_payload || "");
  } catch {
    payload = null;
  }
  if (!payload?.v || !payload?.k || !payload?.w) {
    console.error("[bot] successful_payment: bad payload", sp);
    return;
  }

  const admin = supabaseAdmin();
  const { data: vacancy, error: fetchError } = await admin
    .from("vacancies")
    .select("id, status, expires_at, top_until")
    .eq("id", payload.v)
    .maybeSingle();

  if (fetchError) {
    logDbError("bot: successful_payment lookup", fetchError, { vacancyId: payload.v });
    return;
  }
  if (!vacancy) {
    console.error("[bot] successful_payment: vacancy not found", payload);
    return;
  }

  const result = await applyVacancyPayment(admin, {
    vacancy,
    kind: payload.k,
    periods: payload.w,
    telegramId: payload.t,
    starsAmount: sp.total_amount,
    chargeId: sp.telegram_payment_charge_id,
  });
  if (!result.ok) return;

  logInfo("bot: payment processed", { vacancyId: payload.v, kind: payload.k, periods: payload.w });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(200).json({ ok: true });
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const appUrl = process.env.PUBLIC_APP_URL;

  if (!token || !appUrl) {
    console.error("TELEGRAM_BOT_TOKEN or PUBLIC_APP_URL is not set");
    res.status(200).json({ ok: true });
    return;
  }

  const update = req.body;

  try {
    if (update?.pre_checkout_query) {
      await handlePreCheckoutQuery(update.pre_checkout_query, token);
      res.status(200).json({ ok: true });
      return;
    }

    if (update?.message?.successful_payment) {
      await handleSuccessfulPayment(update.message);
      res.status(200).json({ ok: true });
      return;
    }

    const message = update?.message;
    const text = message?.text?.trim();
    const chatId = message?.chat?.id;

    if (!chatId) {
      res.status(200).json({ ok: true });
      return;
    }

    if (text === "/start" || text?.startsWith("/start ")) {
      const startParam = text.includes(" ") ? text.split(" ")[1] : "";
      const launchUrl = startParam ? `${appUrl}#/r/${startParam}` : appUrl;

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "Створюй, редагуй і ділись резюме прямо в Telegram.",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Start",
                  web_app: { url: launchUrl },
                },
              ],
            ],
          },
        }),
      });
    }
  } catch (err) {
    console.error("Telegram bot handler error:", err);
  }

  res.status(200).json({ ok: true });
}
