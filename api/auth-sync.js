import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { requireUser, isAdminId } from "./_lib/telegramAuth.js";
import { sendJson, methodNotAllowed } from "./_lib/respond.js";

// POST /api/auth-sync — викликається при старті застосунку і періодично
// (heartbeat). Єдине місце, де рядок users створюється/оновлюється —
// telegram_id завжди береться з перевіреного initData, ніколи з тіла запиту.
export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const auth = requireUser(req, botToken);
  if (!auth.ok) return sendJson(res, 401, { error: auth.error });

  const admin = supabaseAdmin();
  const languageCode = typeof req.body?.languageCode === "string" ? req.body.languageCode.slice(0, 8) : null;

  const { data, error } = await admin
    .from("users")
    .upsert(
      {
        telegram_id: auth.user.id,
        telegram_username: auth.user.username || null,
        first_name: auth.user.firstName || null,
        last_active_at: new Date().toISOString(),
        language_code: languageCode,
      },
      { onConflict: "telegram_id" }
    )
    .select("telegram_id, is_banned, ban_reason")
    .single();

  if (error) return sendJson(res, 500, { error: "db_error" });
  if (data.is_banned) return sendJson(res, 403, { error: "banned", reason: data.ban_reason });

  sendJson(res, 200, {
    telegramId: auth.user.id,
    username: auth.user.username,
    firstName: auth.user.firstName,
    isAdmin: isAdminId(auth.user.id),
  });
}
