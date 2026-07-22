import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { sendJson, methodNotAllowed, authenticate, logDbError, logInfo } from "./_lib/respond.js";

const VALID_REASONS = new Set([
  "spam",
  "scam",
  "inappropriate",
  "fake",
  "offensive",
  "other",
]);

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const admin = supabaseAdmin();
  const user = await authenticate(req, res, botToken, admin);
  if (!user) return;

  const { type, vacancyId, applicationId, resumeId, reason, comment } = req.body || {};

  if (!["vacancy", "applicant", "resume"].includes(type)) {
    return sendJson(res, 400, { error: "invalid_type" });
  }
  if (!VALID_REASONS.has(reason)) {
    return sendJson(res, 400, { error: "invalid_reason" });
  }
  const trimmedComment = typeof comment === "string" ? comment.trim().slice(0, 1000) : null;

  let targetTelegramId = null;
  let insertPayload = null;

  if (type === "vacancy") {
    if (!vacancyId) return sendJson(res, 400, { error: "missing_vacancy_id" });

    const { data: vacancy, error } = await admin
      .from("vacancies")
      .select("id, telegram_id, status")
      .eq("id", vacancyId)
      .maybeSingle();
    if (error) {
      logDbError("report: vacancy lookup", error, { telegramId: user.id, vacancyId });
      return sendJson(res, 500, { error: "db_error" });
    }
    if (!vacancy) return sendJson(res, 404, { error: "vacancy_not_found" });
    if (vacancy.telegram_id === user.id) {
      return sendJson(res, 400, { error: "cannot_report_own" });
    }

    targetTelegramId = vacancy.telegram_id;
    insertPayload = {
      type,
      vacancy_id: vacancyId,
      application_id: null,
      resume_id: null,
      reporter_telegram_id: user.id,
      target_telegram_id: targetTelegramId,
      reason,
      comment: trimmedComment,
    };
  } else if (type === "resume") {
    if (!resumeId) return sendJson(res, 400, { error: "missing_resume_id" });

    const { data: resume, error } = await admin
      .from("resumes")
      .select("id, telegram_id")
      .eq("id", resumeId)
      .maybeSingle();
    if (error) {
      logDbError("report: resume lookup", error, { telegramId: user.id, resumeId });
      return sendJson(res, 500, { error: "db_error" });
    }
    if (!resume) return sendJson(res, 404, { error: "resume_not_found" });
    if (resume.telegram_id === user.id) {
      return sendJson(res, 400, { error: "cannot_report_own" });
    }

    targetTelegramId = resume.telegram_id;
    insertPayload = {
      type,
      vacancy_id: null,
      application_id: null,
      resume_id: resumeId,
      reporter_telegram_id: user.id,
      target_telegram_id: targetTelegramId,
      reason,
      comment: trimmedComment,
    };
  } else {
    // type === "applicant" — тільки власник вакансії може поскаржитись на кандидата,
    // який відгукнувся саме на його вакансію.
    if (!applicationId) return sendJson(res, 400, { error: "missing_application_id" });

    const { data: application, error } = await admin
      .from("vacancy_applications")
      .select("id, telegram_id, vacancy_id, vacancies(telegram_id)")
      .eq("id", applicationId)
      .maybeSingle();
    if (error) {
      logDbError("report: application lookup", error, { telegramId: user.id, applicationId });
      return sendJson(res, 500, { error: "db_error" });
    }
    if (!application) return sendJson(res, 404, { error: "application_not_found" });

    const vacancyOwnerId = application.vacancies?.telegram_id;
    if (!vacancyOwnerId || vacancyOwnerId !== user.id) {
      return sendJson(res, 403, { error: "forbidden" });
    }
    if (application.telegram_id === user.id) {
      return sendJson(res, 400, { error: "cannot_report_own" });
    }

    targetTelegramId = application.telegram_id;
    insertPayload = {
      type,
      vacancy_id: application.vacancy_id,
      application_id: applicationId,
      resume_id: null,
      reporter_telegram_id: user.id,
      target_telegram_id: targetTelegramId,
      reason,
      comment: trimmedComment,
    };
  }

  const { error: insertError } = await admin.from("reports").insert(insertPayload);
  if (insertError) {
    // Часткові унікальні індекси (reports_unique_open_*) кидають 23505,
    // якщо той самий юзер вже має відкриту скаргу на той самий об'єкт —
    // для фронтенду це не помилка, а просто "вже надіслано".
    if (insertError.code === "23505") {
      logInfo("report: duplicate open report ignored", { telegramId: user.id, type });
      return sendJson(res, 200, { ok: true, duplicate: true });
    }
    logDbError("report: insert", insertError, { telegramId: user.id, type });
    return sendJson(res, 500, { error: "db_error" });
  }

  logInfo("report: created", { telegramId: user.id, type, targetTelegramId });
  return sendJson(res, 200, { ok: true });
}
