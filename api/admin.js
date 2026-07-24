import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { requireUser, isAdminId } from "./_lib/telegramAuth.js";
import { sendJson, methodNotAllowed, logDbError, logInfo } from "./_lib/respond.js";
import { getCurrentPricing } from "./_lib/pricing.js";
import { scanSite } from "./_lib/surferScan.js";

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
      admin.from("reports").select("*", { count: "exact", head: true }).eq("status", "open"),
    ]);
    const labels = ["totalUsers", "usersToday", "activeToday", "totalVacancies", "pendingCount", "pendingReportsCount"];
    results.forEach((r, i) => {
      if (r.error) logDbError(`admin stats: ${labels[i]}`, r.error, { telegramId: auth.user.id });
    });
    const [
      { count: totalUsers },
      { count: usersToday },
      { count: activeToday },
      { count: totalVacancies },
      { count: pendingCount },
      { count: pendingReportsCount },
    ] = results;
    return sendJson(res, 200, { totalUsers, usersToday, activeToday, totalVacancies, pendingCount, pendingReportsCount });
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

  if (req.method === "GET" && action === "allVacancies") {
    const { data, error } = await admin
      .from("vacancies")
      .select("*, owner:users!vacancies_telegram_id_fkey(telegram_username, first_name, is_banned)")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) {
      logDbError("admin allVacancies GET", error, { telegramId: auth.user.id });
      return sendJson(res, 500, { error: "db_error" });
    }
    return sendJson(res, 200, { vacancies: data });
  }

  if (req.method === "GET" && action === "allResumes") {
    const { data, error } = await admin
      .from("resumes")
      .select("*, owner:users!resumes_telegram_id_fkey(telegram_username, first_name, is_banned)")
      .order("updated_at", { ascending: false })
      .limit(1000);
    if (error) {
      logDbError("admin allResumes GET", error, { telegramId: auth.user.id });
      return sendJson(res, 500, { error: "db_error" });
    }
    return sendJson(res, 200, { resumes: data });
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

  if (req.method === "GET" && action === "reports") {
    const statusFilter = req.query?.status || "open"; // 'open' | 'resolved' | 'dismissed' | 'all'
    let query = admin
      .from("reports")
      .select(
        `id, type, reason, comment, status, created_at, resolved_at, resolved_by,
         vacancy_id, application_id,
         reporter:users!reports_reporter_telegram_id_fkey(telegram_id, telegram_username, first_name),
         target:users!reports_target_telegram_id_fkey(telegram_id, telegram_username, first_name, is_banned),
         vacancies(id, data, status),
         vacancy_applications(id, message, contact, resume_snapshot, vacancy_id)`
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (statusFilter !== "all") query = query.eq("status", statusFilter);

    const { data, error } = await query;
    if (error) {
      logDbError("admin reports GET", error, { telegramId: auth.user.id });
      return sendJson(res, 500, { error: "db_error" });
    }
    return sendJson(res, 200, { reports: data });
  }

  if (req.method === "POST" && action === "resolveReport") {
    const { id, decision, banTarget } = req.body || {};
    if (!id || !["resolved", "dismissed"].includes(decision)) {
      console.warn("[admin] resolveReport: invalid_body", { telegramId: auth.user.id, id, decision });
      return sendJson(res, 400, { error: "invalid_body" });
    }

    const { data: report, error: fetchError } = await admin
      .from("reports")
      .select("id, target_telegram_id, status")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) {
      logDbError("admin resolveReport: fetch", fetchError, { telegramId: auth.user.id, id });
      return sendJson(res, 500, { error: "db_error" });
    }
    if (!report) return sendJson(res, 404, { error: "report_not_found" });

    const { error } = await admin
      .from("reports")
      .update({ status: decision, resolved_by: auth.user.id, resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      logDbError("admin resolveReport POST", error, { telegramId: auth.user.id, id, decision });
      return sendJson(res, 500, { error: "db_error" });
    }

    if (banTarget === true) {
      const { error: banError } = await admin
        .from("users")
        .update({ is_banned: true })
        .eq("telegram_id", report.target_telegram_id);
      if (banError) {
        logDbError("admin resolveReport: ban target", banError, { telegramId: auth.user.id, id, target: report.target_telegram_id });
      }
    }

    logInfo("admin resolveReport POST: ok", { telegramId: auth.user.id, id, decision, banTarget: Boolean(banTarget) });
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "GET" && action === "pricing") {
    const pricing = await getCurrentPricing(admin);
    return sendJson(res, 200, pricing);
  }

  if (req.method === "POST" && action === "setPricing") {
    const { listingPrice, topPrice } = req.body || {};
    const listing = Number(listingPrice);
    const top = Number(topPrice);
    if (!Number.isInteger(listing) || listing < 0 || listing > 1000000) {
      return sendJson(res, 400, { error: "invalid_listing_price" });
    }
    if (!Number.isInteger(top) || top < 0 || top > 1000000) {
      return sendJson(res, 400, { error: "invalid_top_price" });
    }
    const { error } = await admin.from("pricing_settings").upsert({
      id: 1,
      listing_price_stars: listing,
      top_price_stars: top,
      updated_by: auth.user.id,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      logDbError("admin setPricing POST", error, { telegramId: auth.user.id, listing, top });
      return sendJson(res, 500, { error: "db_error" });
    }
    logInfo("admin setPricing POST: ok", { telegramId: auth.user.id, listing, top });
    return sendJson(res, 200, { ok: true, listingPrice: listing, topPrice: top });
  }

  if (req.method === "POST" && action === "setAutoApprove") {
    const { enabled, afterMinutes } = req.body || {};
    const minutes = Number(afterMinutes);
    if (typeof enabled !== "boolean") {
      return sendJson(res, 400, { error: "invalid_enabled" });
    }
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 100000) {
      return sendJson(res, 400, { error: "invalid_after_minutes" });
    }
    const { error } = await admin.from("pricing_settings").upsert({
      id: 1,
      auto_approve_enabled: enabled,
      auto_approve_after_minutes: minutes,
      updated_by: auth.user.id,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      logDbError("admin setAutoApprove POST", error, { telegramId: auth.user.id, enabled, minutes });
      return sendJson(res, 500, { error: "db_error" });
    }
    logInfo("admin setAutoApprove POST: ok", { telegramId: auth.user.id, enabled, minutes });
    return sendJson(res, 200, { ok: true, autoApproveEnabled: enabled, autoApproveAfterMinutes: minutes });
  }

  if (req.method === "POST" && action === "deleteVacancy") {
    const { id } = req.body || {};
    if (!id) return sendJson(res, 400, { error: "missing_id" });
    const { error } = await admin.from("vacancies").delete().eq("id", id);
    if (error) {
      logDbError("admin deleteVacancy POST", error, { telegramId: auth.user.id, id });
      return sendJson(res, 500, { error: "db_error" });
    }
    logInfo("admin deleteVacancy POST: ok", { telegramId: auth.user.id, id });
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "POST" && action === "moderate") {
    const { id, decision, rejectReason } = req.body || {};
    if (!id || !["approve", "reject"].includes(decision)) {
      console.warn("[admin] moderate: invalid_body", { telegramId: auth.user.id, id, decision });
      return sendJson(res, 400, { error: "invalid_body" });
    }

    let update;
    if (decision === "approve") {
      // Якщо вакансію вже колись оплачували (is_paid) і термін показу (expires_at)
      // ще не сплив — це повторна модерація після редагування вже активної
      // вакансії. У такому разі оплата не потрібна: одразу повертаємо "active",
      // без проміжного статусу "approved" (він призначений лише для
      // першої публікації, коли ще треба заплатити).
      // Якщо ж вакансію ще ніколи не оплачували, або оплачений період уже
      // вийшов — це як і раніше "approved", і фронт попросить оплату.
      const { data: existing, error: existingError } = await admin
        .from("vacancies")
        .select("is_paid, expires_at")
        .eq("id", id)
        .maybeSingle();
      if (existingError) {
        logDbError("admin moderate: lookup", existingError, { telegramId: auth.user.id, id });
        return sendJson(res, 500, { error: "db_error" });
      }
      const stillPaidUp = Boolean(existing?.is_paid) && existing?.expires_at && new Date(existing.expires_at).getTime() > Date.now();
      update = {
        status: stillPaidUp ? "active" : "approved",
        moderated_by: auth.user.id,
        moderated_at: new Date().toISOString(),
        reject_reason: null,
      };
    } else {
      update = {
        status: "rejected",
        moderated_by: auth.user.id,
        moderated_at: new Date().toISOString(),
        reject_reason: rejectReason || null,
      };
    }

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

  if (req.method === "GET" && action === "surferSites") {
    const { data, error } = await admin
      .from("surfer_sites")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      logDbError("admin surferSites GET", error, { telegramId: auth.user.id });
      return sendJson(res, 500, { error: "db_error" });
    }
    return sendJson(res, 200, { sites: data });
  }

  if (req.method === "POST" && action === "addSurferSite") {
    const { url, companyName } = req.body || {};
    if (!url || typeof url !== "string" || !/^https?:\/\//.test(url)) {
      return sendJson(res, 400, { error: "invalid_url" });
    }
    const { data, error } = await admin
      .from("surfer_sites")
      .insert({ url, company_name: companyName || null, created_by: auth.user.id })
      .select()
      .maybeSingle();
    if (error) {
      logDbError("admin addSurferSite POST", error, { telegramId: auth.user.id, url });
      return sendJson(res, 500, { error: "db_error" });
    }
    logInfo("admin addSurferSite POST: ok", { telegramId: auth.user.id, url });
    return sendJson(res, 200, { ok: true, site: data });
  }

  if (req.method === "POST" && action === "toggleSurferSite") {
    const { id, isActive } = req.body || {};
    if (!id || typeof isActive !== "boolean") return sendJson(res, 400, { error: "invalid_body" });
    const { error } = await admin.from("surfer_sites").update({ is_active: isActive }).eq("id", id);
    if (error) {
      logDbError("admin toggleSurferSite POST", error, { telegramId: auth.user.id, id });
      return sendJson(res, 500, { error: "db_error" });
    }
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "POST" && action === "deleteSurferSite") {
    const { id } = req.body || {};
    if (!id) return sendJson(res, 400, { error: "missing_id" });
    const { error } = await admin.from("surfer_sites").delete().eq("id", id);
    if (error) {
      logDbError("admin deleteSurferSite POST", error, { telegramId: auth.user.id, id });
      return sendJson(res, 500, { error: "db_error" });
    }
    logInfo("admin deleteSurferSite POST: ok", { telegramId: auth.user.id, id });
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "POST" && action === "scanSurferSite") {
    const { id } = req.body || {};
    if (!id) return sendJson(res, 400, { error: "missing_id" });
    const { data: site, error: siteError } = await admin
      .from("surfer_sites")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (siteError) {
      logDbError("admin scanSurferSite: lookup", siteError, { telegramId: auth.user.id, id });
      return sendJson(res, 500, { error: "db_error" });
    }
    if (!site) return sendJson(res, 404, { error: "site_not_found" });

    const result = await scanSite(admin, site);
    await admin
      .from("surfer_sites")
      .update({
        last_scanned_at: new Date().toISOString(),
        last_scan_status: result.error ? "error" : "ok",
        last_scan_error: result.error,
        found_count: result.found,
        created_count: result.created,
        updated_count: result.updated,
        expired_count: result.expired,
      })
      .eq("id", id);

    logInfo("admin scanSurferSite POST: done", { telegramId: auth.user.id, id, ...result });
    return sendJson(res, 200, { ok: !result.error, ...result });
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
