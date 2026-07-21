// Спільна конфігурація "оформлення документа" для резюме та вакансій:
// (1) кольорова тема — фон + колір тексту (світла / темна),
// (2) вирівнювання — як у Word: по лівому краю чи по центру.
// Обидва параметри незалежні від "template" (він відповідає лише за
// акцентний колір/розкладку секцій).

import { normalizeMediaUrl } from "./media.js";

export const COLOR_THEMES = [
  {
    id: "light",
    name: { uk: "Світла", ru: "Светлая", en: "Light" },
    bg: "#ffffff",
    text: "#1c1c1c",
    textMed: "rgba(28,28,28,0.62)",
    textFaint: "rgba(28,28,28,0.45)",
    divider: "rgba(28,28,28,0.12)",
    avatarText: "#ffffff",
    chipAlpha: "1a",
  },
  {
    id: "dark",
    name: { uk: "Темна", ru: "Тёмная", en: "Dark" },
    bg: "#161616",
    text: "#f5f5f5",
    textMed: "rgba(245,245,245,0.66)",
    textFaint: "rgba(245,245,245,0.46)",
    divider: "rgba(245,245,245,0.16)",
    avatarText: "#161616",
    chipAlpha: "33",
  },
];

export const ALIGNMENTS = [
  { id: "left", name: { uk: "По краю", ru: "По краю", en: "Left" } },
  { id: "center", name: { uk: "По центру", ru: "По центру", en: "Center" } },
];

export const DEFAULT_COLOR_THEME = "dark";

export function getColorTheme(id) {
  return COLOR_THEMES.find((c) => c.id === id) || COLOR_THEMES.find((c) => c.id === DEFAULT_COLOR_THEME);
}

// Фон документа (резюме/вакансії): звичайний суцільний колір теми, або, якщо
// вказано backgroundUrl (картинка чи гіф), — те саме зображення з напівпрозорим
// градієнтом кольору теми поверх нього. 60%, потім 78%, потім 92% — на
// контрастних фото ставало читабельно, але сам фон/гіф практично зникав.
// Тепер: помірний 84% overlay (гіф/фото знову добре видно) + подвійна тінь
// під звичайним текстом + окремий "бейдж"-підклад під заголовками секцій
// (getHeaderStyle) — саме заголовки найчастіше губилися в строкатих
// ділянках фото, а їм окремий контраст важливіший, ніж загальне
// затемнення всього документа.
export function getDocBackgroundStyle(theme, backgroundUrl) {
  if (!backgroundUrl) return { background: theme.bg };
  const url = normalizeMediaUrl(backgroundUrl);
  const isDark = theme.id === "dark";
  const shadowSoft = isDark ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.95)";
  const shadowWide = isDark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.65)";
  return {
    backgroundColor: theme.bg,
    backgroundImage: `linear-gradient(${theme.bg}d6, ${theme.bg}d6), url("${url}")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    textShadow: `0 0 1px ${shadowSoft}, 0 1px 4px ${shadowSoft}, 0 0 10px ${shadowWide}`,
  };
}

export function getAlign(id) {
  return id === "center" ? "center" : "left";
}

// Заголовки секцій ("ПРО МЕНЕ", "ПОРТФОЛІО"...) фарбуються акцентним
// кольором шаблону — на суцільному фоні теми контрасту завжди достатньо,
// але поверх фото/гіфу деякі акценти (особливо приглушений сірий
// "minimal") губилися в строкатих ділянках картинки. Коли є backgroundUrl,
// додаємо заголовку невеликий "бейдж" — напівпрозору підкладку в тон теми,
// яка гарантує контраст незалежно від того, що під нею на фото. На
// звичайному суцільному фоні (без картинки) поведінка НЕ змінюється.
export function getHeaderStyle(theme, accent, hasBackgroundImage) {
  if (!hasBackgroundImage) return { color: accent };
  return {
    color: accent,
    background: theme.id === "dark" ? "rgba(8,8,10,0.6)" : "rgba(255,255,255,0.75)",
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "6px",
    boxDecorationBreak: "clone",
    WebkitBoxDecorationBreak: "clone",
  };
}
