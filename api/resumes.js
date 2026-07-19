import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { sendJson, methodNotAllowed, authenticate } from "./_lib/respond.js";

const MAX_RESUMES_PER_USER = 2;

export default async function handler(req, res) {
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
    if (error) return sendJson(res, 500, { error: "db_error" });
    return sendJson(res, 200, { resumes: data });
  }

  if (req.method === "POST") {
    const { id, data } = req.body || {};
    if (!id || !data || typeof data !== "object") {
      return sendJson(res, 400, { error: "invalid_body" });
    }

    const { count, error: countError } = await admin
      .from("resumes")
      .select("id", { count: "exact", head: true })
      .eq("telegram_id", user.id)
      .neq("id", id);
    if (countError) return sendJson(res, 500, { error: "db_error" });
    if ((count || 0) >= MAX_RESUMES_PER_USER) {
      return sendJson(res, 409, { error: "resume_limit_reached" });
    }

    const { error } = await admin.from("resumes").upsert({
      id,
      telegram_id: user.id, // завжди з верифікованого initData, не з тіла запиту
      data,
    });
    if (error) return sendJson(res, 500, { error: "db_error" });
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "DELETE") {
    const id = req.query?.id || req.body?.id;
    if (!id) return sendJson(res, 400, { error: "missing_id" });
    const { error } = await admin.from("resumes").delete().eq("id", id).eq("telegram_id", user.id);
    if (error) return sendJson(res, 500, { error: "db_error" });
    return sendJson(res, 200, { ok: true });
  }

  return methodNotAllowed(res, ["GET", "POST", "DELETE"]);
}
