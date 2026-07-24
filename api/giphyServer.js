// Серверний відповідник фронтового fetchRandomGifUrl() з lib/giphy.js —
// той самий "кубик", яким юзер сам натискає в GifUrlField при ручному
// створенні вакансії/резюме, тут просто викликається автоматично для
// кожної спарсеної вакансії (окремо для аватарки й окремо для фону).
//
// ЗВІРИТИ: назву env-змінної й параметри запиту (rating, endpoint) треба
// звірити з вашим фронтовим lib/giphy.js — тут припущення за замовчуванням
// (звичайний Giphy Random endpoint + публічний API-ключ у GIPHY_API_KEY).
// Якщо там інакше (інша env-змінна чи власний проксі-ендпоінт) — скажи,
// підправлю в одному місці.

const GIPHY_API_KEY = process.env.GIPHY_API_KEY;

export async function fetchRandomGifUrlServer(tag) {
  if (!GIPHY_API_KEY) {
    console.warn("[giphyServer] GIPHY_API_KEY not set — skipping random media");
    return null;
  }
  try {
    const params = new URLSearchParams({
      api_key: GIPHY_API_KEY,
      tag: tag || "",
      rating: "pg-13",
    });
    const res = await fetch(`https://api.giphy.com/v1/gifs/random?${params.toString()}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.images?.original?.url || null;
  } catch (err) {
    console.warn("[giphyServer] fetch failed", err?.message);
    return null;
  }
}

// Кидає "кубик" двічі — окремо для аватарки/лого (щось предметне, тег
// компанія/офіс) і окремо для фону (щось абстрактне/атмосферне).
export async function rollRandomMedia() {
  const [avatarUrl, backgroundUrl] = await Promise.all([
    fetchRandomGifUrlServer("office business"),
    fetchRandomGifUrlServer("abstract gradient"),
  ]);
  return { avatarUrl, backgroundUrl };
}
