import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { sendJson, methodNotAllowed, authenticate } from "./_lib/respond.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const admin = supabaseAdmin();
  const user = await authenticate(req, res, botToken, admin);
  if (!user) return;

  const { vacancyId, message, resumeId } = req.body || {};
  if (!vacancyId) return sendJson(res, 400, { error: "missing_vacancy_id" });

  const { data: vacancy } = await admin
    .from("vacancies")
    .select("id, status, data")
    .eq("id", vacancyId)
    .maybeSingle();
  if (!vacancy || vacancy.status !== "active") {
    return sendJson(res, 404, { error: "vacancy_not_available" });
  }

  let resumeSnapshot = null;
  if (resumeId) {
    const { data: resume } = await admin
      .from("resumes")
      .select("data")
      .eq("id", resumeId)
      .eq("telegram_id", user.id) // не можна прикріпити чуже резюме
      .maybeSingle();
    resumeSnapshot = resume?.data || null;
  }

  // Якщо вакансія позначена "тільки з резюме" — не приймаємо відгук без
  // валідного (реально належного цьому юзеру) резюме, навіть якщо фронт
  // з якоїсь причини не заблокував кнопку.
  if (vacancy.data?.requireResume && !resumeSnapshot) {
    return sendJson(res, 400, { error: "resume_required" });
  }

  const contact = (resumeSnapshot && resumeSnapshot.phone) || (user.username ? `@${user.username}` : null);

  const { error } = await admin.from("vacancy_applications").insert({
    vacancy_id: vacancyId,
    telegram_id: user.id,
    message: typeof message === "string" ? message.slice(0, 2000) : null,
    contact,
    resume_id: resumeId || null,
    resume_snapshot: resumeSnapshot,
  });
  if (error) return sendJson(res, 500, { error: "db_error" });
  sendJson(res, 200, { ok: true });
}
