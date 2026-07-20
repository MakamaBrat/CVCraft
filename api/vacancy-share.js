import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { sendJson, methodNotAllowed } from "./_lib/respond.js";

// GET /api/vacancy-share?id=... — навмисно без авторизації: той самий
// use-case, що й публічне посилання "поділитись вакансією" (аналог
// /api/resume-share.js). Повертає вакансію тільки якщо вона зараз видима
// публічно (active/paused) — чернетки, вакансії на модерації чи відхилені
// за прямим посиланням не віддаємо, щоб не зливати чужі недооформлені
// дані. Прострочені (expires_at у минулому) теж віддаємо — так фронт може
// показати саме повідомлення "вакансія більше не активна", а не загальне
// "посилання застаріло/не знайдено", яке плутає з резюме.
const VISIBLE_STATUSES = new Set(["active", "paused"]);

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  const id = req.query?.id;
  if (!id) return sendJson(res, 400, { error: "missing_id" });

  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("vacancies")
    .select("data, status, expires_at, top_until, template")
    .eq("id", id)
    .maybeSingle();

  if (error) return sendJson(res, 500, { error: "db_error" });
  if (!data || !VISIBLE_STATUSES.has(data.status)) {
    return sendJson(res, 404, { error: "not_found" });
  }

  const isExpired = Boolean(data.expires_at) && new Date(data.expires_at).getTime() <= Date.now();

  sendJson(res, 200, {
    data: { ...data.data, template: data.template },
    expired: isExpired,
  });
}
