import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { sendJson, methodNotAllowed, authenticate, logDbError, logInfo } from "./_lib/respond.js";

// GET    /api/vacancy-subscribe                       -> { subscriptions: [...] }
// POST   /api/vacancy-subscribe { action:"save",   query, city }  -> { ok, id, notifyBlocked }
// POST   /api/vacancy-subscribe { action:"delete", id }           -> { ok }
//
// Дозволяє юзеру "підписатись на дзвіночок" по поточному фільтру пошуку
// вакансій (VacancyBrowse). Коли пізніше публікується нова вакансія, яка
// відповідає збереженому query/city — /api/_lib/telegramNotify.js шле
// повідомлення в бот. Підписка зберігається НЕЗАЛЕЖНО від того, чи дозволив
// юзер боту писати собі: якщо перше тестове повідомлення не пройшло
// (403 blocked / chat not found), фронт лише показує підказку, а сам рядок
// фільтра лишається збереженим і почне працювати, щойно юзер натисне Start.

const MAX_SUBSCRIPTIONS_PER_USER = 10;

export default async function handler(req, res) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const admin = supabaseAdmin();
  const user = await authenticate(req, res, botToken, admin);
  if (!user) return;

  if (req.method === "GET") {
    const { data, error } = await admin
      .from("vacancy_search_subscriptions")
      .select("id, query, city, created_at")
      .eq("telegram_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      logDbError("vacancy-subscribe GET", error, { telegramId: user.id });
      return sendJson(res, 500, { error: "db_error" });
    }
    return sendJson(res, 200, { subscriptions: data || [] });
  }

  if (req.method !== "POST") return methodNotAllowed(res, ["GET", "POST"]);

  const action = req.body?.action || "save";

  if (action === "delete") {
    const id = req.body?.id;
    if (!id) return sendJson(res, 400, { error: "missing_id" });
    const { error } = await admin
      .from("vacancy_search_subscriptions")
      .delete()
      .eq("id", id)
      .eq("telegram_id", user.id);
    if (error) {
      logDbError("vacancy-subscribe delete", error, { telegramId: user.id, id });
      return sendJson(res, 500, { error: "db_error" });
    }
    logInfo("vacancy-subscribe delete: ok", { telegramId: user.id, id });
    return sendJson(res, 200, { ok: true });
  }

  if (action !== "save") return sendJson(res, 400, { error: "invalid_action" });

  const query = typeof req.body?.query === "string" ? req.body.query.trim().slice(0, 200) : "";
  const city = typeof req.body?.city === "string" ? req.body.city.trim().slice(0, 100) : "";
  if (!query && !city) return sendJson(res, 400, { error: "empty_filter" });

  // Той самий фільтр уже збережено — не плодимо дублікатів, просто
  // повертаємо існуючий запис як успіх.
  const { data: existing, error: existingError } = await admin
    .from("vacancy_search_subscriptions")
    .select("id")
    .eq("telegram_id", user.id)
    .eq("query", query)
    .eq("city", city)
    .maybeSingle();
  if (existingError) {
    logDbError("vacancy-subscribe save: lookup", existingError, { telegramId: user.id });
    return sendJson(res, 500, { error: "db_error" });
  }

  let subscriptionId = existing?.id || null;

  if (!subscriptionId) {
    const { count, error: countError } = await admin
      .from("vacancy_search_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("telegram_id", user.id);
    if (countError) {
      logDbError("vacancy-subscribe save: count", countError, { telegramId: user.id });
      return sendJson(res, 500, { error: "db_error" });
    }
    if ((count || 0) >= MAX_SUBSCRIPTIONS_PER_USER) {
      return sendJson(res, 409, { error: "subscription_limit_reached" });
    }

    const { data: inserted, error: insertError } = await admin
      .from("vacancy_search_subscriptions")
      .insert({ telegram_id: user.id, query, city: city || null })
      .select("id")
      .single();
    if (insertError) {
      logDbError("vacancy-subscribe save: insert", insertError, { telegramId: user.id });
      return sendJson(res, 500, { error: "db_error" });
    }
    subscriptionId = inserted.id;
  }

  // Тестове повідомлення одразу після підписки — так фронт може сказати
  // юзеру ще на цьому кроці, чи треба спершу дозволити боту писати йому,
  // не чекаючи, поки з'явиться підходяща вакансія.
  let notifyBlocked = false;
  if (botToken) {
    const text = [query, city].filter(Boolean).join(" \u00b7 ");
    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: String(user.id),
          text: `🔔 Підписку на пошук вакансій увімкнено: ${text || "усі вакансії"}. Повідомимо, щойно з'явиться підходящий варіант.`,
        }),
      });
      const tgJson = await tgRes.json().catch(() => null);
      notifyBlocked = !tgJson?.ok;
    } catch (err) {
      console.error("[vacancy-subscribe] confirmation send failed", err);
      notifyBlocked = true;
    }
  }

  logInfo("vacancy-subscribe save: ok", { telegramId: user.id, id: subscriptionId, notifyBlocked });
  return sendJson(res, 200, { ok: true, id: subscriptionId, notifyBlocked });
}
