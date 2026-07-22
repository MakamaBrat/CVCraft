import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { sendJson, methodNotAllowed, authenticate } from "./_lib/respond.js";

// Перетворює рядок vacancies (embedded через FK) у форму, сумісну з
// vacancyFromRow на фронтенді (src/lib/vacancy.js) — щоб VacancyDetail
// і VacancyMyApplications могли працювати з ним без додаткового мапінгу.
function vacancyFromEmbeddedRow(row) {
  if (!row) return null;
  return {
    ...row.data,
    id: row.id,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : null,
    status: row.status,
    rejectReason: row.reject_reason,
    expiresAt: row.expires_at,
    topUntil: row.top_until,
    isPaid: row.is_paid,
    template: row.template,
    viewsCount: row.views_count ?? 0,
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const admin = supabaseAdmin();
  const user = await authenticate(req, res, botToken, admin);
  if (!user) return;

  // Явно перелічуємо потрібні колонки з vacancies (замість "*"), щоб не
  // тягнути з бекенду поля, які тут не потрібні (напр. великі текстові
  // блоки з data, якщо їх колись винесуть окремо).
  const { data, error } = await admin
    .from("vacancy_applications")
    .select(
      `id, created_at, message, contact, resume_id,
       vacancies (
         id, status, data, reject_reason, expires_at, top_until, is_paid, template, views_count, created_at, updated_at
       )`
    )
    .eq("telegram_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return sendJson(res, 500, { error: "db_error" });

  const applications = (data || [])
    .filter((row) => row.vacancies) // вакансію могли видалити — не показуємо "порожні" заявки
    .map((row) => ({
      id: row.id,
      appliedAt: row.created_at ? new Date(row.created_at).getTime() : null,
      message: row.message,
      contact: row.contact,
      vacancy: vacancyFromEmbeddedRow(row.vacancies),
    }));

  sendJson(res, 200, { applications });
}
