import { logDbError } from "./respond.js";

// Резервні значення, якщо рядок pricing_settings ще не створений (наприклад,
// міграцію ще не накотили) або запит впав. Мають збігатися зі значеннями
// за замовчуванням у supabase/migration_05_pricing_settings.sql /
// migration_06_duration_pricing.sql.
export const DEFAULT_LISTING_PRICE_STARS = 500; // за 1 період (5 днів) звичайного розміщення
export const DEFAULT_TOP_PRICE_STARS = 5; // за 1 період (5 днів) топ-розміщення (додатково)

// Єдина точка читання актуальних цін. Використовується і публічним
// /api/pricing.js (для відображення на фронті), і /api/vacancy-invoice.js
// (для розрахунку суми інвойсу) — щоб обидва місця завжди бачили те саме.
export async function getCurrentPricing(admin) {
  const { data, error } = await admin
    .from("pricing_settings")
    .select("listing_price_stars, top_price_stars, updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    logDbError("pricing: lookup", error);
  }

  return {
    listingPrice: data?.listing_price_stars ?? DEFAULT_LISTING_PRICE_STARS,
    topPrice: data?.top_price_stars ?? DEFAULT_TOP_PRICE_STARS,
    updatedAt: data?.updated_at ?? null,
  };
}
