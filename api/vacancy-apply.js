import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { sendJson, methodNotAllowed, authenticate } from "./_lib/respond.js";

// Загальний ліміт відгуків на юзера — сумарно по всіх вакансіях, а не
// на одну. Захищає від спаму заявками й тримає списки "Мої відгуки" /
// "Відгуки на вакансію" в розумних межах.
const MAX_APPLICATIONS_PER_USER = 10;

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
    .select("id, status, data, telegram_id")
    .eq("id", vacancyId)
    .maybeSingle();
  if (!vacancy || vacancy.status !== "active") {
    return sendJson(res, 404, { error: "vacancy_not_available" });
  }

  // Взаємна блокування: якщо кандидат заблокував власника вакансії або
  // навпаки — відгук не приймаємо, навіть якщо фронт з якоїсь причини
  // не сховав вакансію зі списку.
  const { data: blocked, error: blockError } = await admin.rpc("is_blocked_pair", {
    user_a: user.id,
    user_b: vacancy.telegram_id,
  });
  if (blockError) return sendJson(res, 500, { error: "db_error" });
  if (blocked) return sendJson(res, 403, { error: "blocked" });

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

  // Один юзер — одна заявка на конкретну вакансію. Без цієї перевірки
  // insert проходив би повторно щоразу після рестарту фронтенду (там
  // статус "вже відгукнувся" тримається лише в оперативній пам'яті).
  const { data: existing } = await admin
    .from("vacancy_applications")
    .select("id")
    .eq("vacancy_id", vacancyId)
    .eq("telegram_id", user.id)
    .maybeSingle();
  if (existing) {
    return sendJson(res, 409, { error: "already_applied" });
  }

  const { count: applicationsCount, error: countError } = await admin
    .from("vacancy_applications")
    .select("id", { count: "exact", head: true })
    .eq("telegram_id", user.id);
  if (countError) return sendJson(res, 500, { error: "db_error" });
  if ((applicationsCount || 0) >= MAX_APPLICATIONS_PER_USER) {
    return sendJson(res, 409, { error: "application_limit_reached" });
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
