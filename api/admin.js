import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { requireUser, isAdminId } from "./_lib/telegramAuth.js";
import { sendJson, methodNotAllowed, logDbError, logInfo } from "./_lib/respond.js";
import { getCurrentPricing } from "./_lib/pricing.js";

async function handlerImpl(req, res) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const auth = requireUser(req, botToken);
  if (!auth.ok) {
    console.error("[admin] auth failed - initData verification", {
      reason: auth.error,
      hasBotToken: Boolean(botToken),
      method: req.method,
      action: req.method === "GET" ? req.query?.action : req.body?.action,
    });
    return sendJson(res, 401, { error: auth.error });
  }

  if (!isAdminId(auth.user.id)) {
    // isAdminId() сам логує [isAdminId] з деталями (incomingId, configuredAdmins).
    // Якщо тут постійно 403 - значить ADMIN_TELEGRAM_IDS у Vercel
    // Environment Variables або не містить цей telegram_id, або має зайві
    // пробіли/лапки, або взагалі не заданий для потрібного оточення
    // (Production/Preview/Development - треба перевірити, що змінна
    // додана саме там, де крутиться цей деплой).
    console.error("[admin] access denied - not admin", {
      telegramId: auth.user.id,
      username: auth.user.username,
    });
    return sendJson(res, 403, { error: "not_admin" });
  }

  logInfo("admin: access granted", { telegramId: auth.user.id, method: req.method });

  const admin = supabaseAdmin();
  const action = req.method === "GET" ? req.query?.action : req.body?.action;

  if (req.method === "GET" && action === "stats") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const results = await Promise.all([
      admin.from("users").select("*", { count: "exact", head: true }),
      admin.from("users").select("*", { count: "exact", head: true }).gte("created_at", todayIso),
      admin.from("users").select("*", { count: "exact", head: true }).gte("last_active_at", todayIso),
      admin.from("vacancies").select("*", { count: "exact", head: true }),
      admin.from("vacancies").select("*", { count: "exact", head: true }).eq("status", "pending_review"),
    ]);
    const labels = ["totalUsers", "usersToday", "activeToday", "totalVacancies", "pendingCount"];
    results.forEach((r, i) => {
      if (r.error) logDbError(`admin stats: ${labels[i]}`, r.error, { telegramId: auth.user.id });
    });
    const [{ count: totalUsers }, { count: usersToday }, { count: activeToday }, { count: totalVacancies }, { count: pendingCount }] = results;
    return sendJson(res, 200, { totalUsers, usersToday, activeToday, totalVacancies, pendingCount });
  }

  if (req.method === "GET" && action === "moderation") {
    const { data, error } = await admin
      .from("vacancies")
      .select("*")
      .eq("status", "pending_review")
      .order("created_at", { ascending: true });
    if (error) {
      logDbError("admin moderation GET", error, { telegramId: auth.user.id });
      return sendJson(res, 500, { error: "db_error" });
    }
    return sendJson(res, 200, { vacancies: data });
  }

  if (req.method === "GET" && action === "applications") {
    const { data, error } = await admin
      .from("vacancy_applications")
      .select("id, message, contact, created_at, telegram_id, vacancy_id, vacancies(data)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      logDbError("admin applications GET", error, { telegramId: auth.user.id });
      return sendJson(res, 500, { error: "db_error" });
    }
    return sendJson(res, 200, { applications: data });
  }

  if (req.method === "GET" && action === "users") {
    const { data, error } = await admin
      .from("users")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      logDbError("admin users GET", error, { telegramId: auth.user.id });
      return sendJson(res, 500, { error: "db_error" });
    }
    return sendJson(res, 200, { users: data });
  }

  if (req.method === "GET" && action === "pricing") {
    const pricing = await getCurrentPricing(admin);
    return sendJson(res, 200, pricing);
  }

  if (req.method === "POST" && action === "setPricing") {
    const { listingPrice, pricePerShow } = req.body || {};
    const listing = Number(listingPrice);
    const perShow = Number(pricePerShow);
    if (!Number.isInteger(listing) || listing < 0 || listing > 1000000) {
      return sendJson(res, 400, { error: "invalid_listing_price" });
    }
    if (!Number.isInteger(perShow) || perShow < 0 || perShow > 1000000) {
      return sendJson(res, 400, { error: "invalid_price_per_show" });
    }
    const { error } = await admin.from("pricing_settings").upsert({
      id: 1,
      listing_price_stars: listing,
      price_per_show_stars: perShow,
      updated_by: auth.user.id,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      logDbError("admin setPricing POST", error, { telegramId: auth.user.id, listing, perShow });
      return sendJson(res, 500, { error: "db_error" });
    }
    logInfo("admin setPricing POST: ok", { telegramId: auth.user.id, listing, perShow });
    return sendJson(res, 200, { ok: true, listingPrice: listing, pricePerShow: perShow });
  }

  if (req.method === "POST" && action === "moderate") {
    const { id, decision, rejectReason } = req.body || {};
    if (!id || !["approve", "reject"].includes(decision)) {
      console.warn("[admin] moderate: invalid_body", { telegramId: auth.user.id, id, decision });
      return sendJson(res, 400, { error: "invalid_body" });
    }
    const update =
      decision === "approve"
        ? { status: "approved", moderated_by: auth.user.id, moderated_at: new Date().toISOString(), reject_reason: null }
        : { status: "rejected", moderated_by: auth.user.id, moderated_at: new Date().toISOString(), reject_reason: rejectReason || null };
    const { error } = await admin.from("vacancies").update(update).eq("id", id);
    if (error) {
      logDbError("admin moderate POST", error, { telegramId: auth.user.id, id, decision });
      return sendJson(res, 500, { error: "db_error" });
    }
    logInfo("admin moderate POST: ok", { telegramId: auth.user.id, id, decision });
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "POST" && action === "ban") {
    const { telegramId, banned } = req.body || {};
    if (!telegramId || typeof banned !== "boolean") return sendJson(res, 400, { error: "invalid_body" });
    const { error } = await admin.from("users").update({ is_banned: banned }).eq("telegram_id", telegramId);
    if (error) {
      logDbError("admin ban POST", error, { telegramId: auth.user.id, targetTelegramId: telegramId, banned });
      return sendJson(res, 500, { error: "db_error" });
    }
    logInfo("admin ban POST: ok", { telegramId: auth.user.id, targetTelegramId: telegramId, banned });
    return sendJson(res, 200, { ok: true });
  }

  console.warn("[admin] no matching route", { method: req.method, action });
  return methodNotAllowed(res, ["GET", "POST"]);
}

export default async function handler(req, res) {
  try {
    await handlerImpl(req, res);
  } catch (err) {
    console.error("[admin] unhandled exception", {
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
