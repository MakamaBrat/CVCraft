import { useEffect, useState } from "react";

// Універсальний аватар/лого для резюме та вакансій. Якщо є url (посилання
// на фото, наприклад завантажене на Imgur) — показуємо картинку; якщо url
// немає, або вона не завантажилась (биту посилання, приватний альбом
// тощо) — падаємо назад на коло з ініціалами, як було раніше.
export default function Avatar({ url, name, accent, theme, size = 12 }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [url]);

  const sizeCls = size === 10 ? "w-10 h-10" : "w-12 h-12";
  const trimmedUrl = (url || "").trim();

  if (trimmedUrl && !failed) {
    return (
      <img
        src={trimmedUrl}
        alt={name || "avatar"}
        className={`${sizeCls} rounded-full object-cover shrink-0`}
        style={{ background: accent }}
        onError={() => setFailed(true)}
      />
    );
  }

  const initials = (name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div
      className={`${sizeCls} rounded-full flex items-center justify-center font-semibold text-sm shrink-0`}
      style={{ background: accent, color: theme.avatarText }}
    >
      {initials}
    </div>
  );
}
