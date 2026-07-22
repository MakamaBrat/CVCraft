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

  // Ховаємо відгуки кандидатів, з якими є взаємне блокування (в будь-яку
  // сторону) — на рівні сервера, а не лише через hiddenIds на фронті. Без
  // цього приховані кандидати знову з'являлись би після перезавантаження
  // сторінки, бо hiddenIds жив тільки в оперативній пам'яті React.
  const { data: blockRows, error: blockError } = await admin
    .from("blocks")
    .select("blocker_telegram_id, blocked_telegram_id")
    .or(`blocker_telegram_id.eq.${user.id},blocked_telegram_id.eq.${user.id}`);
  if (blockError) return sendJson(res, 500, { error: "db_error" });

  const blockedSet = new Set(
    (blockRows || []).map((r) =>
      String(r.blocker_telegram_id) === String(user.id)
        ? String(r.blocked_telegram_id)
        : String(r.blocker_telegram_id)
    )
  );

  // Розгортаємо вкладений об'єкт users(...) у пласке поле telegram_username,
  // щоб фронтенду не треба було знати про структуру джойну.
  const applicants = (data || [])
    .filter((row) => !blockedSet.has(String(row.telegram_id)))
    .map(({ users, ...rest }) => ({
      ...rest,
      telegram_username: users?.telegram_username || null,
    }));

  sendJson(res, 200, { applicants });
}
