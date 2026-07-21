import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { sendJson, methodNotAllowed, authenticate, logDbError, logInfo } from "./_lib/respond.js";

const MAX_RESUMES_PER_USER = 2;

async function handlerImpl(req, res) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const admin = supabaseAdmin();
  const user = await authenticate(req, res, botToken, admin);
  if (!user) return;

  if (req.method === "GET") {
    const { data, error } = await admin
      .from("resumes")
      .select("id, data, updated_at")
      .eq("telegram_id", user.id)
      .order("updated_at", { ascending: false });
    if (error) {
      logDbError("resumes GET", error, { telegramId: user.id });
      return sendJson(res, 500, { error: "db_error" });
    }
    logInfo("resumes GET: ok", { telegramId: user.id, count: data?.length });
    return sendJson(res, 200, { resumes: data });
  }

  if (req.method === "POST") {
    const { id, data } = req.body || {};
    if (!id || !data || typeof data !== "object") {
      console.warn("[resumes] save: invalid_body", { telegramId: user.id, id, hasData: Boolean(data) });
      return sendJson(res, 400, { error: "invalid_body" });
    }

    const { data: existing, error: existingError } = await admin
      .from("resumes")
      .select("id")
      .eq("id", id)
      .eq("telegram_id", user.id)
      .maybeSingle();
    if (existingError) {
      logDbError("resumes POST: existing check", existingError, { telegramId: user.id, id });
      return sendJson(res, 500, { error: "db_error" });
    }

    // Ліміт кількості резюме перевіряємо тільки при створенні нового —
    // редагування вже існуючого резюме не повинно на нього натикатись.
    if (!existing) {
      const { count, error: countError } = await admin
        .from("resumes")
        .select("id", { count: "exact", head: true })
        .eq("telegram_id", user.id);
      if (countError) {
        logDbError("resumes POST: count", countError, { telegramId: user.id, id });
        return sendJson(res, 500, { error: "db_error" });
      }
      if ((count || 0) >= MAX_RESUMES_PER_USER) {
        console.warn("[resumes] save: limit_reached", { telegramId: user.id, count });
        return sendJson(res, 409, { error: "resume_limit_reached" });
      }
    }

    const { error } = await admin.from("resumes").upsert({
      id,
      telegram_id: user.id,
      data,
    });
    if (error) {
      // Найчастіші причини "резюме зникає одразу після створення":
      // - невірний тип/формат id (не uuid) -> upsert падає, фронт міг
      //   не показати помилку і просто перезапитати порожній список;
      // - service-role ключ насправді не service-role (RLS deny, code 42501);
      // - колонка telegram_id не того типу/назви, що очікує upsert.
      logDbError("resumes POST: upsert", error, { telegramId: user.id, id });
      return sendJson(res, 500, { error: "db_error" });
    }
    logInfo("resumes POST: ok", { telegramId: user.id, id });
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "DELETE") {
    const id = req.query?.id || req.body?.id;
    if (!id) return sendJson(res, 400, { error: "missing_id" });
    const { error } = await admin.from("resumes").delete().eq("id", id).eq("telegram_id", user.id);
    if (error) {
      logDbError("resumes DELETE", error, { telegramId: user.id, id });
      return sendJson(res, 500, { error: "db_error" });
    }
    logInfo("resumes DELETE: ok", { telegramId: user.id, id });
    return sendJson(res, 200, { ok: true });
  }

  return methodNotAllowed(res, ["GET", "POST", "DELETE"]);
}

export default async function handler(req, res) {
  try {
    await handlerImpl(req, res);
  } catch (err) {
    console.error("[resumes] unhandled exception", {
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
