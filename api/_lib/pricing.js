import { logDbError } from "./respond.js";

// Резервні значення, якщо рядок pricing_settings ще не створений (наприклад,
// міграцію ще не накотили) або запит впав. Мають збігатися зі значеннями
// за замовчуванням у supabase/migration_05_pricing_settings.sql /
// migration_06_duration_pricing.sql.
export const DEFAULT_LISTING_PRICE_STARS = 500; // за 1 період (1 тиждень) звичайного розміщення
export const DEFAULT_TOP_PRICE_STARS = 5; // за 1 період (1 тиждень) топ-розміщення (додатково)
export const DEFAULT_AUTO_APPROVE_ENABLED = false;
export const DEFAULT_AUTO_APPROVE_AFTER_MINUTES = 60;

// Єдина точка читання актуальних цін. Використовується і публічним
// /api/pricing.js (для відображення на фронті), і /api/vacancy-invoice.js
// (для розрахунку суми інвойсу) — щоб обидва місця завжди бачили те саме.
// Тепер сюди ж додано автоапрув (auto_approve_enabled/after_minutes) —
// раніше ці колонки тут не читались взагалі, тож /api/admin?action=pricing
// завжди повертав autoApproveEnabled: undefined, і тумблер в адмінці
// показувався вимкненим після кожного перезаходу, навіть якщо в БД було
// збережено true.
export async function getCurrentPricing(admin) {
  const { data, error } = await admin
    .from("pricing_settings")
    .select("listing_price_stars, top_price_stars, auto_approve_enabled, auto_approve_after_minutes, updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    logDbError("pricing: lookup", error);
  }

  return {
    listingPrice: data?.listing_price_stars ?? DEFAULT_LISTING_PRICE_STARS,
    topPrice: data?.top_price_stars ?? DEFAULT_TOP_PRICE_STARS,
    autoApproveEnabled: data?.auto_approve_enabled ?? DEFAULT_AUTO_APPROVE_ENABLED,
    autoApproveAfterMinutes: data?.auto_approve_after_minutes ?? DEFAULT_AUTO_APPROVE_AFTER_MINUTES,
    updatedAt: data?.updated_at ?? null,
  };
}
