import { GIPHY_API_KEY } from "./config.js";

// Тягне одну випадкову гіфку з Giphy і повертає пряме посилання на неї
// (те саме поле, куди юзер міг би вручну вставити URL з giphy.com).
// tag — необов'язкове слово-фільтр (наприклад "developer", "office"), щоб
// рандом був хоч трохи релевантний контексту, а не абсолютно довільний.
export async function fetchRandomGifUrl(tag = "") {
  const params = new URLSearchParams({
    api_key: GIPHY_API_KEY,
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
