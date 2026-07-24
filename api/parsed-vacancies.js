import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { sendJson, methodNotAllowed, logDbError, logInfo } from "./_lib/respond.js";

// Публічний, повністю анонімний список — на відміну від /api/vacancies тут
// немає ні модерації, ні блокувань між юзерами (спарсене не належить
// жодному юзеру), тому й перевірка авторизації не потрібна.
async function handlerImpl(req, res) {
  const admin = supabaseAdmin();

  if (req.method !== "GET") {
    return methodNotAllowed(res, ["GET"]);
  }

  const id = req.query?.id;

  if (id) {
    const { data, error } = await admin
      .from("parsed_vacancies")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      logDbError("parsed-vacancies GET by id", error, { id });
      return sendJson(res, 500, { error: "db_error" });
    }
    if (!data) return sendJson(res, 404, { error: "not_found" });
    return sendJson(res, 200, { vacancy: data });
  }

  const { data, error } = await admin
    .from("parsed_vacancies")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) {
    logDbError("parsed-vacancies GET list", error);
    return sendJson(res, 500, { error: "db_error" });
  }

  logInfo("parsed-vacancies GET list: ok", { count: data?.length });
  return sendJson(res, 200, { vacancies: data });
}

export default async function handler(req, res) {
  try {
    await handlerImpl(req, res);
  } catch (err) {
    console.error("[parsed-vacancies] unhandled exception", {
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
