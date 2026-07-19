import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { sendJson, methodNotAllowed } from "./_lib/respond.js";

// POST /api/vacancy-view { id } — раніше клієнт викликав
// supabase.rpc('register_vacancy_show', ...) напряму з anon-ключем, тож
// будь-хто міг накрутити/спалити чужі показники show. Тепер лічильник
// рухає тільки service-role.
export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  const id = req.body?.id;
  if (!id) return sendJson(res, 400, { error: "missing_id" });

  const admin = supabaseAdmin();
  const { error } = await admin.rpc("register_vacancy_show", { p_vacancy_id: id });
  if (error) return sendJson(res, 500, { error: "db_error" });
  sendJson(res, 200, { ok: true });
}
