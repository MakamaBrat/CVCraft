// Спільна конфігурація "оформлення документа" для резюме та вакансій:
// (1) кольорова тема — фон + колір тексту (світла / темна),
// (2) вирівнювання — як у Word: по лівому краю чи по центру.
// Обидва параметри незалежні від "template" (він відповідає лише за
// акцентний колір/розкладку секцій).

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

export function getColorTheme(id) {
  return COLOR_THEMES.find((c) => c.id === id) || COLOR_THEMES[0];
}

export function getAlign(id) {
  return id === "center" ? "center" : "left";
}
