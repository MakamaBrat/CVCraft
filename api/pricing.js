import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { sendJson, methodNotAllowed } from "./_lib/respond.js";
import { getCurrentPricing } from "./_lib/pricing.js";

// GET /api/pricing
// Публічний (без авторизації) ендпоінт — віддає поточні ціни в Telegram
// Stars, щоб фронт міг показати їх ДО того, як користувач авторизований
// через Telegram initData (наприклад, у превью вакансії). Даних, крім
// самих цін, тут немає, тож окрема авторизація не потрібна.
export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    const admin = supabaseAdmin();
    const pricing = await getCurrentPricing(admin);
    return sendJson(res, 200, pricing);
  } catch (err) {
    console.error("[pricing] unhandled exception", { message: err?.message, stack: err?.stack });
    return sendJson(res, 500, { error: "internal_error" });
  }
}
