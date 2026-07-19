export function sendJson(res, status, body) {
  res.status(status).json(body);
}

export function methodNotAllowed(res, allowed) {
  res.setHeader("Allow", allowed.join(", "));
  res.status(405).json({ error: "method_not_allowed" });
}

// Єдина точка логування помилок Supabase. console.error у Vercel-функції
// потрапляє у Deployments -> [деплой] -> Functions -> Logs (або `vercel logs`).
// Без цього виклику PostgREST-помилки (RLS deny, constraint violation,
// невірний тип колонки, відсутня таблиця тощо) гасяться у generic
// {error:"db_error"} і в UI, і в логах - тому в Vercel нічого не видно.
export function logDbError(context, error, extra) {
  console.error("[db_error] " + context, {
    message: error && error.message,
    code: error && error.code,
    details: error && error.details,
    hint: error && error.hint,
    extra: extra || {},
  });
}

export function logInfo(context, data) {
  console.log("[info] " + context, data || {});
}

// Перевіряє initData і банов юзера. Повертає {telegramId} або сама
// відправляє помилку і повертає null — виклик має тоді одразу return.
export async function authenticate(req, res, botToken, admin) {
  const { requireUser } = await import("./telegramAuth.js");
  const result = requireUser(req, botToken);
  if (!result.ok) {
    console.error("[auth] initData verification failed", {
      reason: result.error,
      hasBotToken: Boolean(botToken),
      url: req.url,
      method: req.method,
    });
    sendJson(res, 401, { error: result.error || "unauthorized" });
    return null;
  }

  const { data: userRow, error: userLookupError } = await admin
    .from("users")
    .select("telegram_id, is_banned")
    .eq("telegram_id", result.user.id)
    .maybeSingle();

  if (userLookupError) {
    logDbError("authenticate: users lookup", userLookupError, { telegramId: result.user.id });
    // Не блокуємо запит через цю помилку - продовжуємо як незабанений,
    // але лог покаже, якщо саме тут ламається (напр. таблиця users
    // недоступна для service-role, помилка з'єднання тощо).
  }

  if (userRow?.is_banned) {
    console.log("[auth] blocked banned user", { telegramId: result.user.id, url: req.url });
    sendJson(res, 403, { error: "banned" });
    return null;
  }

  logInfo("authenticate: ok", { telegramId: result.user.id, url: req.url, method: req.method });
  return result.user;
}
