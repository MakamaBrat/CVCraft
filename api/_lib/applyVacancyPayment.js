import { logDbError, logInfo } from "./respond.js";

const PERIOD_DAYS = 7;
const PERIOD_MS = PERIOD_DAYS * 24 * 60 * 60 * 1000;

// Спільна логіка застосування "оплати" (продовження expires_at/top_until,
// активація вакансії) — використовується і для реальних Telegram Stars
// платежів (successful_payment у /api/bot.js), і для безкоштовної видачі,
// коли підсумкова сума виходить 0 ⭐ (ціна = 0), тоді інвойс не потрібен.
//
// vacancy: { id, status, expires_at, top_until }
// kind: "listing" | "extend" | "top"
// periods: кількість періодів по 1 тижню
// starsAmount: скільки ⭐ фактично списано (0 для безкоштовної видачі)
// chargeId: telegram_payment_charge_id або null для безкоштовних видач
export async function applyVacancyPayment(admin, { vacancy, kind, periods, telegramId, starsAmount, chargeId }) {
  const now = Date.now();
  const addMs = periods * PERIOD_MS;
  const update = {};

  if (kind === "listing") {
    update.expires_at = new Date(now + addMs).toISOString();
    update.status = "active";
    update.is_paid = true;
  } else if (kind === "extend") {
    const base = Math.max(now, vacancy.expires_at ? new Date(vacancy.expires_at).getTime() : now);
    update.expires_at = new Date(base + addMs).toISOString();
    update.status = "active";
  } else if (kind === "top") {
    const base = Math.max(now, vacancy.top_until ? new Date(vacancy.top_until).getTime() : now);
    update.top_until = new Date(base + addMs).toISOString();
  }

  const { error: updateError } = await admin.from("vacancies").update(update).eq("id", vacancy.id);
  if (updateError) {
    logDbError("applyVacancyPayment: update", updateError, { vacancyId: vacancy.id });
    return { ok: false };
  }

  const { error: insertError } = await admin.from("vacancy_payments").insert({
    vacancy_id: vacancy.id,
    telegram_id: String(telegramId),
    kind,
    stars_amount: starsAmount,
    periods_added: periods,
    telegram_payment_charge_id: chargeId,
  });
  if (insertError) {
    logDbError("applyVacancyPayment: vacancy_payments insert", insertError, { vacancyId: vacancy.id });
  }

  logInfo("applyVacancyPayment: applied", { vacancyId: vacancy.id, kind, periods, starsAmount });
  return { ok: true };
}
