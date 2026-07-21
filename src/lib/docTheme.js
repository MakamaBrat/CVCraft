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
// градієнтом кольору теми поверх нього. 60% (як було раніше) виявилось
// замало — на світлих ділянках фото текст ставав нечитабельним ("видно по
// половинах"). 78% — робочий баланс: фото/гіф все ще добре видно, але текст
// не зливається з картинкою. Додатково додаємо легку тінь під текст —
// це підстраховка для особливо контрастних/строкатих фото, де самого
// градієнта може не вистачити. GIF у background-image анімується нормально
// в браузері; у PDF (html2canvas) застигне на кадрі.
export function getDocBackgroundStyle(theme, backgroundUrl) {
  if (!backgroundUrl) return { background: theme.bg };
  const url = normalizeMediaUrl(backgroundUrl);
  const shadowColor = theme.id === "dark" ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.85)";
  return {
    backgroundColor: theme.bg,
    backgroundImage: `linear-gradient(${theme.bg}c7, ${theme.bg}c7), url("${url}")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    textShadow: `0 1px 3px ${shadowColor}`,
  };
}

export function getAlign(id) {
  return id === "center" ? "center" : "left";
}
