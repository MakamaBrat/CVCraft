import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { sendJson, methodNotAllowed, logDbError } from "./_lib/respond.js";

// POST /api/vacancy-view
// body: { id: vacancyId }
// Публічний ендпоінт (без авторизації) — викликається фронтом, коли
// кандидат відкриває деталі вакансії (VacancyDetail). Інкремент
// атомарний і рахується тільки для активних вакансій (див.
// increment_vacancy_views у migration_08_vacancy_views.sql). Ніяких чутливих
// даних не повертається й не приймається, тож окрема авторизація не потрібна.
export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  const { id } = req.body || {};
  if (!id) return sendJson(res, 400, { error: "missing_id" });

  try {
    const admin = supabaseAdmin();
    const { error } = await admin.rpc("increment_vacancy_views", { p_vacancy_id: id });
    if (error) {
      logDbError("vacancy-view: increment", error, { id });
      return sendJson(res, 500, { error: "db_error" });
    }
    return sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error("[vacancy-view] unhandled exception", { message: err?.message, stack: err?.stack });
    return sendJson(res, 500, { error: "internal_error" });
  }
}
