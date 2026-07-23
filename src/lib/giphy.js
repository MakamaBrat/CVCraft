import { GIPHY_API_KEY, GIPHY_API_KEY_FALLBACK } from "./config.js";

async function requestRandomGif(apiKey, tag) {
  const params = new URLSearchParams({
    api_key: apiKey,
    rating: "g",
  });
  if (tag) params.set("tag", tag);

  const res = await fetch(`https://api.giphy.com/v1/gifs/random?${params.toString()}`);
  if (!res.ok) throw new Error(`giphy_error_${res.status}`);

  const json = await res.json();
  const url =
    json?.data?.images?.original?.url ||
    json?.data?.images?.downsized?.url ||
    json?.data?.url;
  if (!url) throw new Error("giphy_empty_result");
  return url;
}

// Тягне одну випадкову гіфку з Giphy і повертає пряме посилання на неї
// (те саме поле, куди юзер міг би вручну вставити URL з giphy.com).
// tag — необов'язкове слово-фільтр (наприклад "developer", "office"), щоб
// рандом був хоч трохи релевантний контексту, а не абсолютно довільний.
//
// Спершу пробуємо основний ключ (GIPHY_API_KEY, ваш власний); якщо він
// впав з будь-якої причини (429 — вичерпано ліміт, ключ ще не активний,
// мережева помилка тощо) — автоматично повторюємо запит на публічному
// demo-ключі (GIPHY_API_KEY_FALLBACK), і тільки якщо впав і він —
// пробрасуємо помилку далі (тоді UI покаже errorLabel).
export async function fetchRandomGifUrl(tag = "") {
  const keys = [GIPHY_API_KEY, GIPHY_API_KEY_FALLBACK].filter(Boolean);

  let lastError = null;
  for (const key of keys) {
    try {
      return await requestRandomGif(key, tag);
    } catch (err) {
      lastError = err;
      // пробуємо наступний ключ у списку
    }
  }
  throw lastError || new Error("giphy_no_keys_configured");
}
