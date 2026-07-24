import { getCurrentPricing } from "./pricing.js";
import { notifyMatchingSubscribers } from "./telegramNotify.js";
import { logDbError, logInfo } from "./respond.js";

// runAutoApprove(admin, options?)
//
// Спільна логіка автосхвалення вакансій, якими користуються і
// /api/cron-auto-approve.js (за розкладом, як страховка), і lazy-тригер
// у публічному списку вакансій (/api/vacancies?scope=public), щоб
// вакансія публікувалась одразу, як тільки хтось відкриє список, а не
// чекала наступного тіку крону.
//
// Логіка ідентична ручному approve в admin.js: якщо вакансію вже
// оплачено і оплачений період ще не вийшов (повторна модерація після
// редагування) — одразу "active" без оплати, інакше — "approved".
//
// Повертає { enabled, approved, failed }. Ніколи не кидає виняток назовні
// (щоб виклик з "гарячого" списку вакансій не міг зламати сам список) —
// помилки лише логуються, у відповіді error: true.
export async function runAutoApprove(admin, options = {}) {
  const { limit = 200, source = "unknown" } = options;

  try {
    const pricing = await getCurrentPricing(admin);

    if (!pricing.autoApproveEnabled) {
      return { ok: true, enabled: false, approved: 0, failed: 0 };
    }

    const cutoffIso = new Date(Date.now() - pricing.autoApproveAfterMinutes * 60_000).toISOString();

    const { data: candidates, error: fetchError } = await admin
      .from("vacancies")
      .select("id, is_paid, expires_at")
      .eq("status", "pending_review")
      .lte("created_at", cutoffIso)
      .limit(limit);

    if (fetchError) {
      logDbError("runAutoApprove: fetch candidates", fetchError, { source });
      return { ok: false, enabled: true, approved: 0, failed: 0, error: "db_error" };
    }

    if (!candidates?.length) {
      return { ok: true, enabled: true, approved: 0, failed: 0 };
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    let approvedCount = 0;
    const errors = [];

    for (const vacancy of candidates) {
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
        .eq("status", "pending_review") // страховка від гонки з паралельним ручним approve/reject або іншим викликом runAutoApprove
        .select("*")
        .maybeSingle();

      if (updateError) {
        logDbError("runAutoApprove: update", updateError, { id: vacancy.id, source });
        errors.push(vacancy.id);
        continue;
      }
      if (!updated) continue; // хтось встиг обробити раніше нас

      approvedCount += 1;

      if (nextStatus === "active") {
        await notifyMatchingSubscribers(admin, botToken, updated).catch((err) =>
          console.error("[runAutoApprove] subscriber notification failed", err)
        );
      }
    }

    logInfo("runAutoApprove: done", { approvedCount, errors: errors.length, cutoffIso, source });
    return { ok: true, enabled: true, approved: approvedCount, failed: errors.length };
  } catch (err) {
    console.error("[runAutoApprove] unhandled exception", { message: err?.message, stack: err?.stack, source });
    return { ok: false, enabled: true, approved: 0, failed: 0, error: "internal_error" };
  }
}
