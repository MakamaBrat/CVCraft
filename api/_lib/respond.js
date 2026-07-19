export function sendJson(res, status, body) {
  res.status(status).json(body);
}

export function methodNotAllowed(res, allowed) {
  res.setHeader("Allow", allowed.join(", "));
  res.status(405).json({ error: "method_not_allowed" });
}

// Перевіряє initData і банов юзера. Повертає {telegramId} або сама
// відправляє помилку і повертає null — виклик має тоді одразу return.
export async function authenticate(req, res, botToken, admin) {
  const { requireUser } = await import("./telegramAuth.js");
  const result = requireUser(req, botToken);
  if (!result.ok) {
    sendJson(res, 401, { error: result.error || "unauthorized" });
    return null;
  }

  const { data: userRow } = await admin
    .from("users")
    .select("telegram_id, is_banned")
    .eq("telegram_id", result.user.id)
    .maybeSingle();

  if (userRow?.is_banned) {
    sendJson(res, 403, { error: "banned" });
    return null;
  }

  return result.user;
}
