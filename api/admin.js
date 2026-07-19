import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { requireUser, isAdminId } from "./_lib/telegramAuth.js";
import { sendJson, methodNotAllowed } from "./_lib/respond.js";

// Усі admin-дії йдуть через один файл: перевірка адмінства відбувається
// ОДИН раз тут, на сервері, за ADMIN_TELEGRAM_IDS (без VITE_ префікса —
// це значення ніколи не потрапляє у фронтенд-бандл). Раніше isAdmin()
// рахувався на клієнті з VITE_ADMIN_TELEGRAM_IDS — тобто перевірка була
// лише косметична (ховала кнопку в UI), а фактичний запис у vacancies/users
// проходив з тим самим повноправним anon-ключем, що й у звичайного юзера.
export default async function handler(req, res) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const auth = requireUser(req, botToken);
  if (!auth.ok) return sendJson(res, 401, { error: auth.error });
  if (!isAdminId(auth.user.id)) return sendJson(res, 403, { error: "not_admin" });

  const admin = supabaseAdmin();
  const action = req.method === "GET" ? req.query?.action : req.body?.action;

  if (req.method === "GET" && action === "stats") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const [{ count: totalUsers }, { count: usersToday }, { count: activeToday }, { count: totalVacancies }, { count: pendingCount }] =
      await Promise.all([
        admin.from("users").select("*", { count: "exact", head: true }),
        admin.from("users").select("*", { count: "exact", head: true }).gte("created_at", todayIso),
        admin.from("users").select("*", { count: "exact", head: true }).gte("last_active_at", todayIso),
        admin.from("vacancies").select("*", { count: "exact", head: true }),
        admin.from("vacancies").select("*", { count: "exact", head: true }).eq("status", "pending_review"),
      ]);
    return sendJson(res, 200, { totalUsers, usersToday, activeToday, totalVacancies, pendingCount });
  }

  if (req.method === "GET" && action === "moderation") {
    const { data, error } = await admin
      .from("vacancies")
      .select("*")
      .eq("status", "pending_review")
      .order("created_at", { ascending: true });
    if (error) return sendJson(res, 500, { error: "db_error" });
    return sendJson(res, 200, { vacancies: data });
  }

  if (req.method === "GET" && action === "applications") {
    const { data, error } = await admin
      .from("vacancy_applications")
      .select("id, message, contact, created_at, telegram_id, vacancy_id, vacancies(data)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return sendJson(res, 500, { error: "db_error" });
    return sendJson(res, 200, { applications: data });
  }

  if (req.method === "GET" && action === "users") {
    const { data, error } = await admin
      .from("users")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return sendJson(res, 500, { error: "db_error" });
    return sendJson(res, 200, { users: data });
  }

  if (req.method === "POST" && action === "moderate") {
    const { id, decision, rejectReason } = req.body || {};
    if (!id || !["approve", "reject"].includes(decision)) {
      return sendJson(res, 400, { error: "invalid_body" });
    }
    const update =
      decision === "approve"
        ? { status: "approved", moderated_by: auth.user.id, moderated_at: new Date().toISOString(), reject_reason: null }
        : { status: "rejected", moderated_by: auth.user.id, moderated_at: new Date().toISOString(), reject_reason: rejectReason || null };
    const { error } = await admin.from("vacancies").update(update).eq("id", id);
    if (error) return sendJson(res, 500, { error: "db_error" });
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "POST" && action === "ban") {
    const { telegramId, banned } = req.body || {};
    if (!telegramId || typeof banned !== "boolean") return sendJson(res, 400, { error: "invalid_body" });
    const { error } = await admin.from("users").update({ is_banned: banned }).eq("telegram_id", telegramId);
    if (error) return sendJson(res, 500, { error: "db_error" });
    return sendJson(res, 200, { ok: true });
  }

  return methodNotAllowed(res, ["GET", "POST"]);
}
