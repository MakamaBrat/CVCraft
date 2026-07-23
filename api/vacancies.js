import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { sendJson, methodNotAllowed, authenticate, logDbError, logInfo } from "./_lib/respond.js";
import { requireUser, isAdminId } from "./_lib/telegramAuth.js";

const MAX_VACANCIES_PER_USER = 5;
const CLIENT_WRITABLE = new Set(["data", "template"]);

// Публічний список бачать і гості (без Telegram initData), тому тут не можна
// викликати authenticate() — вона сама шле 401, коли токена немає. Натомість
// тихо пробуємо розпізнати юзера через requireUser (нічого не відправляє
// клієнту сама), і якщо це вдалось — повертаємо його telegram_id для
// подальшої фільтрації заблокованих пар. Невалідний/відсутній initData тут
// НЕ помилка — просто трактуємо як анонімного відвідувача.
function peekUserId(req, botToken) {
  const result = requireUser(req, botToken);
  return result.ok ? result.user.id : null;
}

// Повертає Set telegram_id усіх, з ким у viewerId є взаємне блокування
// (незалежно від напрямку) — щоб одним запитом відфільтрувати список,
// замість виклику is_blocked_pair() на кожен рядок окремо.
async function getBlockedCounterparties(admin, viewerId) {
  if (!viewerId) return new Set();
  const { data, error } = await admin
    .from("blocks")
    .select("blocker_telegram_id, blocked_telegram_id")
    .or(`blocker_telegram_id.eq.${viewerId},blocked_telegram_id.eq.${viewerId}`);
  if (error) {
    logDbError("getBlockedCounterparties", error, { viewerId });
    return new Set(); // при помилці краще не ховати нічого, ніж 500-ити весь список
  }
  const set = new Set();
  for (const row of data || []) {
    if (String(row.blocker_telegram_id) === String(viewerId)) set.add(String(row.blocked_telegram_id));
    else set.add(String(row.blocker_telegram_id));
  }
  return set;
}

async function handlerImpl(req, res) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const admin = supabaseAdmin();

  if (req.method === "GET" && req.query?.scope === "public") {
    const { data, error } = await admin
      .from("vacancies")
      .select("*")
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("top_until", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) {
      logDbError("vacancies GET public", error);
      return sendJson(res, 500, { error: "db_error" });
    }

    // Якщо запит прийшов від розпізнаваного (авторизованого) юзера — ховаємо
    // вакансії роботодавців, з якими є взаємне блокування в будь-яку сторону.
    // Гостям (viewerId === null) фільтрація не потрібна й не виконується.
    const viewerId = peekUserId(req, botToken);
    const blockedSet = await getBlockedCounterparties(admin, viewerId);
    const visible = blockedSet.size
      ? (data || []).filter((v) => !blockedSet.has(String(v.telegram_id)))
      : data;

    logInfo("vacancies GET public: ok", { count: visible?.length, hiddenByBlock: (data?.length || 0) - (visible?.length || 0) });
    return sendJson(res, 200, { vacancies: visible });
  }

  const user = await authenticate(req, res, botToken, admin);
  if (!user) return;

  if (req.method === "GET") {
    const { data, error } = await admin
      .from("vacancies")
      .select("*")
      .eq("telegram_id", user.id)
      .order("updated_at", { ascending: false });
    if (error) {
      logDbError("vacancies GET own", error, { telegramId: user.id });
      return sendJson(res, 500, { error: "db_error" });
    }
    logInfo("vacancies GET own: ok", { telegramId: user.id, count: data?.length });
    return sendJson(res, 200, { vacancies: data });
  }

  if (req.method === "POST") {
    const action = req.body?.action || "save";

    if (action === "submit") {
      const id = req.body?.id;
      if (!id) return sendJson(res, 400, { error: "missing_id" });
      const { data: existing, error: existingError } = await admin
        .from("vacancies")
        .select("id, status")
        .eq("id", id)
        .eq("telegram_id", user.id)
        .maybeSingle();
      if (existingError) {
        logDbError("vacancies POST submit: lookup", existingError, { telegramId: user.id, id });
        return sendJson(res, 500, { error: "db_error" });
      }
      if (!existing) {
        console.warn("[vacancies] submit: not_found", { telegramId: user.id, id });
        return sendJson(res, 404, { error: "not_found" });
      }
      if (!["draft", "rejected"].includes(existing.status)) {
        console.warn("[vacancies] submit: invalid_status", { telegramId: user.id, id, status: existing.status });
        return sendJson(res, 409, { error: "invalid_status" });
      }
      const { error } = await admin
        .from("vacancies")
        .update({ status: "pending_review", reject_reason: null })
        .eq("id", id)
        .eq("telegram_id", user.id);
      if (error) {
        logDbError("vacancies POST submit: update", error, { telegramId: user.id, id });
        return sendJson(res, 500, { error: "db_error" });
      }
      logInfo("vacancies POST submit: ok", { telegramId: user.id, id });
      return sendJson(res, 200, { ok: true });
    }

    const { id, data, template } = req.body || {};
    if (!id || !data || typeof data !== "object") {
      console.warn("[vacancies] save: invalid_body", { telegramId: user.id, id, hasData: Boolean(data) });
      return sendJson(res, 400, { error: "invalid_body" });
    }

    const { data: existing, error: existingError } = await admin
      .from("vacancies")
      .select("id, status")
      .eq("id", id)
      .eq("telegram_id", user.id)
      .maybeSingle();
    if (existingError) {
      logDbError("vacancies POST save: lookup", existingError, { telegramId: user.id, id });
      return sendJson(res, 500, { error: "db_error" });
    }

    let resubmitForReview = false;

    if (!existing) {
      // Адмінам (ADMIN_TELEGRAM_IDS) ліміт вакансій не застосовується —
      // без цього рано чи пізно комусь з адмінів заблокує створення нової
      // тестової/службової вакансії просто через власний ліміт у 5 штук.
      if (!isAdminId(user.id)) {
        const { count, error: countError } = await admin
          .from("vacancies")
          .select("id", { count: "exact", head: true })
          .eq("telegram_id", user.id);
        if (countError) {
          logDbError("vacancies POST save: count", countError, { telegramId: user.id });
          return sendJson(res, 500, { error: "db_error" });
        }
        if ((count || 0) >= MAX_VACANCIES_PER_USER) {
          console.warn("[vacancies] save: limit_reached", { telegramId: user.id, count });
          return sendJson(res, 409, { error: "vacancy_limit_reached" });
        }
      }
    } else if (["approved", "active", "paused"].includes(existing.status)) {
      // Вакансія вже публічна — дозволяємо редагувати, але правки не мають
      // з'являтись без повторної модерації: ховаємо її назад у
      // pending_review. draft/rejected/pending_review редагуються як і
      // раніше, без зміни статусу.
      resubmitForReview = true;
    }

    const payload = { id, telegram_id: user.id, data };
    if (template) payload.template = template;
    if (resubmitForReview) {
      payload.status = "pending_review";
      payload.reject_reason = null;
    }
    void CLIENT_WRITABLE;

    const { error } = await admin.from("vacancies").upsert(payload);
    if (error) {
      logDbError("vacancies POST save: upsert", error, { telegramId: user.id, id, isNew: !existing });
      return sendJson(res, 500, { error: "db_error" });
    }
    logInfo("vacancies POST save: ok", { telegramId: user.id, id, isNew: !existing, resubmitForReview });
    return sendJson(res, 200, { ok: true, resubmitForReview });
  }

  if (req.method === "DELETE") {
    const id = req.query?.id || req.body?.id;
    if (!id) return sendJson(res, 400, { error: "missing_id" });
    const { error } = await admin.from("vacancies").delete().eq("id", id).eq("telegram_id", user.id);
    if (error) {
      logDbError("vacancies DELETE", error, { telegramId: user.id, id });
      return sendJson(res, 500, { error: "db_error" });
    }
    logInfo("vacancies DELETE: ok", { telegramId: user.id, id });
    return sendJson(res, 200, { ok: true });
  }

  return methodNotAllowed(res, ["GET", "POST", "DELETE"]);
}

export default async function handler(req, res) {
  try {
    await handlerImpl(req, res);
  } catch (err) {
    console.error("[vacancies] unhandled exception", {
      message: err?.message,
      stack: err?.stack,
      method: req.method,
      query: req.query,
    });
    if (!res.headersSent) {
      sendJson(res, 500, { error: "internal_error" });
    }
  }
}
