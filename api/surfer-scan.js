import { supabaseAdmin } from "../_lib/supabaseAdmin.js";
import { sendJson } from "../_lib/respond.js";
import { scanSite } from "../_lib/surferScan.js";

// Викликається Vercel Cron (див. vercel.json). Захищено через заголовок
// Authorization: Bearer <CRON_SECRET> — Vercel Cron сам додає його,
// якщо CRON_SECRET заданий в Environment Variables.
export default async function handler(req, res) {
  const auth = req.headers.authorization || "";
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return sendJson(res, 401, { error: "unauthorized" });
  }

  const admin = supabaseAdmin();
  const { data: sites, error } = await admin.from("surfer_sites").select("*").eq("is_active", true);
  if (error) {
    console.error("[cron surfer-scan] failed to load sites", error);
    return sendJson(res, 500, { error: "db_error" });
  }

  const results = [];
  for (const site of sites || []) {
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
      .eq("id", site.id);
    results.push({ id: site.id, url: site.url, ...result });
  }

  console.log("[cron surfer-scan] done", { sitesScanned: results.length });
  return sendJson(res, 200, { ok: true, results });
}
