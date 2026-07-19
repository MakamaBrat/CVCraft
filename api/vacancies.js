import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { sendJson, methodNotAllowed, authenticate } from "./_lib/respond.js";

const MAX_VACANCIES_PER_USER = 5;
// Поля, які клієнт НІКОЛИ не може встановлювати напряму — статус,
// оплата й лічильники показів рухаються тільки через окремі серверні дії
// (submit / модерація адміном / вебхук оплати).
const CLIENT_WRITABLE = new Set(["data", "template"]);

export default async function handler(req, res) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const admin = supabaseAdmin();

  // Публічний перелік активних вакансій — доступний без авторизації,
  // це навмисно публічна вітрина (те саме, що раніше відкривала RLS-policy).
  if (req.method === "GET" && req.query?.scope === "public") {
    const { data, error } = await admin
      .from("vacancies")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (error) return sendJson(res, 500, { error: "db_error" });
    return sendJson(res, 200, { vacancies: data });
  }

  const user = await authenticate(req, res, botToken, admin);
  if (!user) return;

  if (req.method === "GET") {
    const { data, error } = await admin
      .from("vacancies")
      .select("*")
      .eq("telegram_id", user.id)
      .order("updated_at", { ascending: false });
    if (error) return sendJson(res, 500, { error: "db_error" });
    return sendJson(res, 200, { vacancies: data });
  }

  if (req.method === "POST") {
    const action = req.body?.action || "save";

    if (action === "submit") {
      const id = req.body?.id;
      if (!id) return sendJson(res, 400, { error: "missing_id" });
      // тільки власник і тільки з draft/rejected можна відправити на модерацію
      const { data: existing } = await admin
        .from("vacancies")
        .select("id, status")
        .eq("id", id)
        .eq("telegram_id", user.id)
        .maybeSingle();
      if (!existing) return sendJson(res, 404, { error: "not_found" });
      if (!["draft", "rejected"].includes(existing.status)) {
        return sendJson(res, 409, { error: "invalid_status" });
      }
      const { error } = await admin
        .from("vacancies")
        .update({ status: "pending_review", reject_reason: null })
        .eq("id", id)
        .eq("telegram_id", user.id);
      if (error) return sendJson(res, 500, { error: "db_error" });
      return sendJson(res, 200, { ok: true });
    }

    // action === "save": створення/редагування чернетки
    const { id, data, template } = req.body || {};
    if (!id || !data || typeof data !== "object") {
      return sendJson(res, 400, { error: "invalid_body" });
    }

    const { data: existing } = await admin
      .from("vacancies")
      .select("id, status")
      .eq("id", id)
      .eq("telegram_id", user.id)
      .maybeSingle();

    if (!existing) {
      const { count, error: countError } = await admin
        .from("vacancies")
        .select("id", { count: "exact", head: true })
        .eq("telegram_id", user.id);
      if (countError) return sendJson(res, 500, { error: "db_error" });
      if ((count || 0) >= MAX_VACANCIES_PER_USER) {
        return sendJson(res, 409, { error: "vacancy_limit_reached" });
      }
    } else if (!["draft", "rejected"].includes(existing.status)) {
      // не даємо редагувати вміст вакансії, що вже на модерації/активна —
      // інакше можна було б підмінити текст після схвалення
      return sendJson(res, 409, { error: "not_editable" });
    }

    const payload = { id, telegram_id: user.id, data };
    if (template) payload.template = template;
    void CLIENT_WRITABLE; // документує намір: тільки ці поля приймаються від клієнта

    const { error } = await admin.from("vacancies").upsert(payload);
    if (error) return sendJson(res, 500, { error: "db_error" });
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "DELETE") {
    const id = req.query?.id || req.body?.id;
    if (!id) return sendJson(res, 400, { error: "missing_id" });
    const { error } = await admin.from("vacancies").delete().eq("id", id).eq("telegram_id", user.id);
    if (error) return sendJson(res, 500, { error: "db_error" });
    return sendJson(res, 200, { ok: true });
  }

  return methodNotAllowed(res, ["GET", "POST", "DELETE"]);
}
