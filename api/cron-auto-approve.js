import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { sendJson, methodNotAllowed, logDbError, logInfo } from "./_lib/respond.js";
import { getCurrentPricing } from "./_lib/pricing.js";
import { notifyMatchingSubscribers } from "./_lib/telegramNotify.js";

// GET /api/cron-auto-approve
//
// Раніше налаштування автоапруву (auto_approve_enabled / after_minutes)
// зберігалось в адмінці, але НІХТО його не читав і нічого не робив —
// вакансії продовжували чекати ручного схвалення в /api/admin.js. Цей
// файл — власне виконавець: періодично (Vercel Cron, див. vercel.json)
// шукає вакансії в pending_review, що чекають довше за
// auto_approve_after_minutes, і схвалює їх — тим самим шляхом, що й ручний
// approve в admin.js (moderate action), включно з тим самим правилом
// stillPaidUp (повторна модерація вже оплаченої відредагованої вакансії
// одразу йде в "active", без оплати).
//
// Захищено CRON_SECRET (Vercel Cron шле його як Authorization: Bearer
// <CRON_SECRET>, налаштовується в Project Settings -> Environment
// Variables; той самий секрет прописується в vercel.json).
export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization || "";
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn("[cron-auto-approve] unauthorized call attempt");
      return sendJson(res, 401, { error: "unauthorized" });
    }
  } else {
    console.warn("[cron-auto-approve] CRON_SECRET not configured — endpoint is unprotected");
  }

  try {
    const admin = supabaseAdmin();
    const pricing = await getCurrentPricing(admin);

    if (!pricing.autoApproveEnabled) {
      logInfo("cron-auto-approve: disabled, skipping", {});
      return sendJson(res, 200, { ok: true, enabled: false, approved: 0 });
    }

    const cutoffIso = new Date(Date.now() - pricing.autoApproveAfterMinutes * 60_000).toISOString();

    const { data: candidates, error: fetchError } = await admin
      .from("vacancies")
      .select("id, is_paid, expires_at")
      .eq("status", "pending_review")
      .lte("created_at", cutoffIso)
      .limit(200);

    if (fetchError) {
      logDbError("cron-auto-approve: fetch candidates", fetchError, {});
      return sendJson(res, 500, { error: "db_error" });
    }

    if (!candidates?.length) {
      logInfo("cron-auto-approve: no candidates", { cutoffIso });
      return sendJson(res, 200, { ok: true, enabled: true, approved: 0 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    let approvedCount = 0;
    const errors = [];

    for (const vacancy of candidates) {
      // Та сама логіка, що й ручний approve в admin.js: якщо вакансію вже
      // оплачено і оплачений період ще не вийшов (повторна модерація після
      // редагування) — одразу "active" без оплати, інакше — "approved"
      // (фронт попросить оплату при наступному відкритті).
      const stillPaidUp =
        Boolean(vacancy.is_paid) && vacancy.expires_at && new Date(vacancy.expires_at).getTime() > Date.now();
      const nextStatus = stillPaidUp ? "active" : "approved";

      const { data: updated, error: updateError } = await admin
        .from("vacancies")
        .update({
          status: nextStatus,
          moderated_by: null, // авто, не конкретний адмін
          moderated_at: new Date().toISOString(),
          reject_reason: null,
        })
        .eq("id", vacancy.id)
        .eq("status", "pending_review") // страховка від гонки з паралельним ручним approve/reject
        .select("*")
        .maybeSingle();

      if (updateError) {
        logDbError("cron-auto-approve: update", updateError, { id: vacancy.id });
        errors.push(vacancy.id);
        continue;
      }
      if (!updated) continue; // хтось встиг обробити раніше нас

      approvedCount += 1;

      // Якщо вакансія одразу стала "active" (stillPaidUp) — це перша
      // видима публікація для підписників фільтрів пошуку, сповіщаємо їх
      // так само, як при звичайній оплаті (vacancy-invoice.js/bot.js).
      if (nextStatus === "active") {
        await notifyMatchingSubscribers(admin, botToken, updated).catch((err) =>
          console.error("[cron-auto-approve] subscriber notification failed", err)
        );
      }
    }

    logInfo("cron-auto-approve: done", { approvedCount, errors: errors.length, cutoffIso });
    return sendJson(res, 200, { ok: true, enabled: true, approved: approvedCount, failed: errors.length });
  } catch (err) {
    console.error("[cron-auto-approve] unhandled exception", { message: err?.message, stack: err?.stack });
    return sendJson(res, 500, { error: "internal_error" });
  }
}
