import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { sendJson, methodNotAllowed, authenticate } from "./_lib/respond.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const admin = supabaseAdmin();
  const user = await authenticate(req, res, botToken, admin);
  if (!user) return;

  const vacancyId = req.query?.vacancyId;
  if (!vacancyId) return sendJson(res, 400, { error: "missing_vacancy_id" });

  const { data: vacancy } = await admin
    .from("vacancies")
    .select("id, telegram_id")
    .eq("id", vacancyId)
    .maybeSingle();
  if (!vacancy || vacancy.telegram_id !== user.id) {
    return sendJson(res, 403, { error: "forbidden" });
  }

  const { data, error } = await admin
    .from("vacancy_applications")
    .select("id, message, contact, resume_id, resume_snapshot, created_at, telegram_id, users(telegram_username)")
    .eq("vacancy_id", vacancyId)
    .order("created_at", { ascending: false });
  if (error) return sendJson(res, 500, { error: "db_error" });

  // Розгортаємо вкладений об'єкт users(...) у пласке поле telegram_username,
  // щоб фронтенду не треба було знати про структуру джойну.
  const applicants = (data || []).map(({ users, ...rest }) => ({
    ...rest,
    telegram_username: users?.telegram_username || null,
  }));

  sendJson(res, 200, { applicants });
}
