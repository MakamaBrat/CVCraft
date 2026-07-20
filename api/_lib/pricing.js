import { logDbError } from "./respond.js";

// Резервні значення, якщо рядок pricing_settings ще не створений (наприклад,
// міграцію ще не накотили) або запит впав. Мають збігатися зі значеннями
// за замовчуванням у supabase/migration_05_pricing_settings.sql.
export const DEFAULT_LISTING_PRICE_STARS = 500;
export const DEFAULT_PRICE_PER_SHOW_STARS = 1;

// Єдина точка читання актуальних цін. Використовується і публічним
// /api/pricing.js (для відображення на фронті), і /api/vacancy-invoice.js
// (для розрахунку суми інвойсу) — щоб обидва місця завжди бачили те саме.
export async function getCurrentPricing(admin) {
  const { data, error } = await admin
    .from("pricing_settings")
    .select("listing_price_stars, price_per_show_stars, updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    logDbError("pricing: lookup", error);
  }

  return {
    listingPrice: data?.listing_price_stars ?? DEFAULT_LISTING_PRICE_STARS,
    pricePerShow: data?.price_per_show_stars ?? DEFAULT_PRICE_PER_SHOW_STARS,
    updatedAt: data?.updated_at ?? null,
  };
}
