import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { sendJson, methodNotAllowed, authenticate } from "./_lib/respond.js";

// POST /api/vacancy-withdraw
// body: { vacancyId }
// Дозволяє кандидату забрати свій відгук на вакансію. Видаляємо рядок
// лише якщо він належить самому юзеру (eq telegram_id) — так само, як у
// vacancy-apply.js ніхто не може прибрати чужу заявку.
export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const admin = supabaseAdmin();
  const user = await authenticate(req, res, botToken, admin);
  if (!user) return;

  const { vacancyId } = req.body || {};
  if (!vacancyId) return sendJson(res, 400, { error: "missing_vacancy_id" });

  const { data, error } = await admin
    .from("vacancy_applications")
    .delete()
    .eq("vacancy_id", vacancyId)
    .eq("telegram_id", user.id)
    .select("id");
  if (error) return sendJson(res, 500, { error: "db_error" });
  if (!data || data.length === 0) {
    return sendJson(res, 404, { error: "not_found" });
  }

  sendJson(res, 200, { ok: true });
}
