import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { sendJson, methodNotAllowed } from "./_lib/respond.js";

// GET /api/resume-share?id=... — навмисно без авторизації: це той самий
// use-case, що й публічне посилання "поділитись резюме". Але на відміну
// від старого anon-RLS-доступу, тут неможливо перелічити чужі резюме
// (потрібен точний UUID) і повертаються тільки потрібні поля.
export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  const id = req.query?.id;
  if (!id) return sendJson(res, 400, { error: "missing_id" });

  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("resumes")
    .select("data, telegram_id, users(telegram_username)")
    .eq("id", id)
    .maybeSingle();
  if (error) return sendJson(res, 500, { error: "db_error" });
  if (!data) return sendJson(res, 404, { error: "not_found" });

  sendJson(res, 200, { data: data.data, telegramUsername: data.users?.telegram_username || null });
}
