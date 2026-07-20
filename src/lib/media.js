// Люди зазвичай копіюють посилання на сторінку гіфки (напр. з адресного
// рядка giphy.com чи tenor.com), а не пряме посилання на файл. Такий
// url — це html-сторінка, а не зображення, тому <img>/background-image
// його просто не покаже (виглядає, ніби "гіф не працює"). Тут наскільки
// можливо автоматично перетворюємо відомі share-посилання на пряме
// медіа; решту (напр. Tenor, для якого прямий лінк без API не вивести)
// повертаємо як є.
export function normalizeMediaUrl(url) {
  const u = (url || "").trim();
  if (!u) return u;

  // giphy.com/gifs/<slug>-<id>  →  media.giphy.com/media/<id>/giphy.gif
  const giphyPage = u.match(/^https?:\/\/(?:www\.)?giphy\.com\/gifs\/(?:[a-zA-Z0-9-]*-)?([a-zA-Z0-9]+)\/?(?:\?.*)?$/i);
  if (giphyPage) {
    return `https://media.giphy.com/media/${giphyPage[1]}/giphy.gif`;
  }

  // giphy.com/embed/<id>  →  теж легко перетворюється
  const giphyEmbed = u.match(/^https?:\/\/(?:www\.)?giphy\.com\/embed\/([a-zA-Z0-9]+)\/?(?:\?.*)?$/i);
  if (giphyEmbed) {
    return `https://media.giphy.com/media/${giphyEmbed[1]}/giphy.gif`;
  }

  return u;
}
