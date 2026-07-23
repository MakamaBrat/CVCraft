// DEPRECATED: do not add logic here.
// This file used to build PDFs from the live #resume-doc DOM node and
// never implemented vacancy export at all — that's why resumes looked
// wrong and vacancies threw "Vacancy PDF is not migrated yet.".
//
// The real implementation lives in pdf.js and renders the same
// shareTemplate.js HTML used for the .html export, so PDF/HTML/Telegram
// share the exact same branded layout (КОНТАКТИ/УМОВИ/ТЕХНОЛОГІЇ card +
// full description + "Відкрити в Telegram" button).
//
// This file only re-exports pdf.js so that any import still pointing at
// "./pdf.jsx" (explicit extension) keeps working instead of silently
// resolving to the old, broken behavior.
export { generateResumePdf, generateVacancyPdf } from "./pdf.js";
