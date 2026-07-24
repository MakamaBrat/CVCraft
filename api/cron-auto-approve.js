import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { sendJson, methodNotAllowed } from "./_lib/respond.js";
import { runAutoApprove } from "./_lib/autoApprove.js";

// GET /api/cron-auto-approve
//
// Раніше налаштування автоапруву (auto_approve_enabled / after_minutes)
// зберігалось в адмінці, але НІХТО його не читав і нічого не робив —
// вакансії продовжували чекати ручного схвалення в /api/admin.js. Цей
// файл — власне виконавець: періодично (Vercel Cron, див. vercel.json)
// шукає вакансії в pending_review, що чекають довше за
// auto_approve_after_minutes, і схвалює їх — тим самим шляхом, що й ручний
// approve в admin.js (moderate action), включно з тим самим правилом
// stillPaidUp (повторна модерація вже оплаченої відредагованої вакансії
// одразу йде в "active", без оплати).
//
// Це "страховка": та сама перевірка запускається ліниво (lazy) і в
// /api/vacancies.js (scope=public), щоб вакансія публікувалась одразу,
// щойно хтось відкриє список, а не чекала наступного тіку крону. Крон
// лишається на випадок, якщо список ніхто не відкриває (наприклад, вночі).
//
// Захищено CRON_SECRET (Vercel Cron шле його як Authorization: Bearer
// <CRON_SECRET>, налаштовується в Project Settings -> Environment
// Variables; той самий секрет прописується в vercel.json).
export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization || "";
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn("[cron-auto-approve] unauthorized call attempt");
      return sendJson(res, 401, { error: "unauthorized" });
    }
  } else {
    console.warn("[cron-auto-approve] CRON_SECRET not configured — endpoint is unprotected");
  }

  const admin = supabaseAdmin();
  const result = await runAutoApprove(admin, { source: "cron" });

  if (result.error === "db_error" || result.error === "internal_error") {
    return sendJson(res, 500, { error: result.error });
  }

  return sendJson(res, 200, {
    ok: result.ok,
    enabled: result.enabled,
    approved: result.approved,
    failed: result.failed,
  });
}
