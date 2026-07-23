import { buildResumeShareHtml, buildVacancyShareHtml } from "./shareTemplate.js";

// Генерує самодостатній HTML-файл резюме/вакансії за фіксованим шаблоном
// (shareTemplate.js) — КОНТАКТИ/УМОВИ/ТЕХНОЛОГІЇ зверху, повний опис знизу,
// кнопка "Відкрити в Telegram" з посиланням на конкретний запис наприкінці.
// На відміну від старої версії, тут НЕ клонується живий DOM картки з
// застосунку (#resume-doc/#vacancy-doc) — файл завжди виглядає однаково,
// незалежно від поточного вигляду екрана попереднього перегляду.

export async function generateResumeHtml(resume, { shareUrl, lang } = {}) {
  const { html, fileName } = buildResumeShareHtml(resume, { shareUrl, lang });
  return { blob: new Blob([html], { type: "text/html;charset=utf-8" }), fileName };
}

export async function generateVacancyHtml(vacancy, { shareUrl, lang } = {}) {
  const { html, fileName } = buildVacancyShareHtml(vacancy, { shareUrl, lang });
  return { blob: new Blob([html], { type: "text/html;charset=utf-8" }), fileName };
}
