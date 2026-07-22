import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { sendJson, methodNotAllowed, authenticate } from "./_lib/respond.js";

// POST   /api/block   { action: "block", targetTelegramId, applicationId?, reason? }
// POST   /api/block   { action: "unblock", targetTelegramId }
// GET    /api/block   -> { blocked: [{ telegramId, telegramUsername, firstName, createdAt }] }
//                         (кого поточний юзер заблокував; для екрана "чорний список")

export default async function handler(req, res) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const admin = supabaseAdmin();
  const user = await authenticate(req, res, botToken, admin);
  if (!user) return;

  if (req.method === "GET") {
    const { data, error } = await admin
      .from("blocks")
      .select("blocked_telegram_id, created_at, users:blocked_telegram_id(telegram_username, first_name)")
      .eq("blocker_telegram_id", user.id)
      .order("created_at", { ascending: false });
    if (error) return sendJson(res, 500, { error: "db_error" });
    const blocked = (data || []).map((row) => ({
      telegramId: row.blocked_telegram_id,
      telegramUsername: row.users?.telegram_username || null,
      firstName: row.users?.first_name || null,
      createdAt: row.created_at,
    }));
    return sendJson(res, 200, { blocked });
  }

  if (req.method !== "POST") return methodNotAllowed(res, ["GET", "POST"]);

  const { action, targetTelegramId, applicationId, reason } = req.body || {};
  if (!targetTelegramId) return sendJson(res, 400, { error: "missing_target" });
  if (String(targetTelegramId) === String(user.id)) {
    return sendJson(res, 400, { error: "cannot_block_self" });
  }

  if (action === "unblock") {
    const { error } = await admin
      .from("blocks")
      .delete()
      .eq("blocker_telegram_id", user.id)
      .eq("blocked_telegram_id", targetTelegramId);
    if (error) return sendJson(res, 500, { error: "db_error" });
    return sendJson(res, 200, { ok: true });
  }

  if (action !== "block") return sendJson(res, 400, { error: "invalid_action" });

  // Якщо applicationId переданий — перевіряємо, що targetTelegramId дійсно
  // автор саме цього відгуку, щоб не можна було заблокувати довільний id.
  if (applicationId) {
    const { data: application } = await admin
      .from("vacancy_applications")
      .select("telegram_id")
      .eq("id", applicationId)
      .maybeSingle();
    if (!application || application.telegram_id !== targetTelegramId) {
      return sendJson(res, 400, { error: "application_mismatch" });
    }
  }

  const { error } = await admin
    .from("blocks")
    .upsert(
      {
        blocker_telegram_id: user.id,
        blocked_telegram_id: targetTelegramId,
        application_id: applicationId || null,
        reason: typeof reason === "string" ? reason.slice(0, 500) : null,
      },
      { onConflict: "blocker_telegram_id,blocked_telegram_id" }
    );
  if (error) return sendJson(res, 500, { error: "db_error" });
  sendJson(res, 200, { ok: true });
}
