import { buildAppHomeLink } from "./config.js";
import { getColorTheme } from "./docTheme.js";
import { calcAge, formatAge } from "./age.js";

// Окремий, самодостатній HTML-шаблон для файлів, які людина скачує/шерить/
// отримує від бота (на відміну від #resume-doc/#vacancy-doc, які — це живий
// DOM картки в застосунку). Побудований так, щоб виглядати як компактна
// "картка" зверху (аватар, контакти, ключові умови/навички) і повний
// розгорнутий опис знизу, а в кінці — кнопка "Відкрити в Telegram" з
// посиланням на конкретне резюме/вакансію в застосунку та коротка підказка.

const ACCENTS = {
  minimal: "#4b5563",
  modern: "#6c5ce7",
  bold: "#ff7a59",
  classic: "#2f6fb0",
};

const LABELS = {
  uk: {
    contacts: "КОНТАКТИ",
    age: "Вік",
    city: "Місто",
    telegram: "Telegram",
    email: "Email",
    phone: "Телефон",
    conditions: "УМОВИ",
    technologies: "ТЕХНОЛОГІЇ",
    education: "ОСВІТА",
    vacancyEyebrow: "Вакансія",
    description: "ОПИС",
    requirements: "ВИМОГИ",
    resumeEyebrow: "Резюме",
    aboutMe: "ПРО МЕНЕ",
    experience: "ДОСВІД РОБОТИ",
    portfolio: "ПОРТФОЛІО",
    openInTelegram: "Відкрити в Telegram",
    backToApp: "CV GRAMs →",
    tip: "Порада: відкривайте у застосунку Telegram — вкладені файли та посилання коректно працюють саме там.",
  },
  ru: {
    contacts: "КОНТАКТЫ",
    age: "Возраст",
    city: "Город",
    telegram: "Telegram",
    email: "Email",
    phone: "Телефон",
    conditions: "УСЛОВИЯ",
    technologies: "ТЕХНОЛОГИИ",
    education: "ОБРАЗОВАНИЕ",
    vacancyEyebrow: "Вакансия",
    description: "ОПИСАНИЕ",
    requirements: "ТРЕБОВАНИЯ",
    resumeEyebrow: "Резюме",
    aboutMe: "О СЕБЕ",
    experience: "ОПЫТ РАБОТЫ",
    portfolio: "ПОРТФОЛИО",
    openInTelegram: "Открыть в Telegram",
    backToApp: "CV GRAMs →",
    tip: "Совет: открывайте в приложении Telegram — вложенные файлы и ссылки корректно работают именно там.",
  },
  en: {
    contacts: "CONTACTS",
    age: "Age",
    city: "City",
    telegram: "Telegram",
    email: "Email",
    phone: "Phone",
    conditions: "CONDITIONS",
    technologies: "TECHNOLOGIES",
    education: "EDUCATION",
    vacancyEyebrow: "Job post",
    description: "DESCRIPTION",
    requirements: "REQUIREMENTS",
    resumeEyebrow: "Resume",
    aboutMe: "ABOUT ME",
    experience: "EXPERIENCE",
    portfolio: "PORTFOLIO",
    openInTelegram: "Open in Telegram",
    backToApp: "CV GRAMs →",
    tip: "Tip: open this in the Telegram app — attached files and links work correctly only there.",
  },
};

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function nl2br(str) {
  return escapeHtml(str).replace(/\n/g, "<br/>");
}

function initialsOf(name) {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";
}

function sanitizeFileName(name) {
  return (name || "document")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function section(title, bodyHtml) {
  if (!bodyHtml) return "";
  return `
    <section class="section">
      <h3 class="section-title">${escapeHtml(title)}</h3>
      ${bodyHtml}
    </section>`;
}

function shell({ accent, theme, docTitle, headerHtml, bodyHtml, footerHtml }) {
  return `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(docTitle)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #0a0a0a; }
  body { display: flex; justify-content: center; padding: 32px 14px; font-family: Manrope, sans-serif; color: ${theme.text}; }
  .card { width: 100%; max-width: 440px; background: ${theme.bg}; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.45); padding: 28px 24px; }
  .header { display: flex; align-items: center; gap: 12px; padding-bottom: 16px; margin-bottom: 16px; border-bottom: 2px solid ${accent}; }
  .avatar { width: 46px; height: 46px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; color: ${theme.avatarText}; background: ${accent}; }
  .heading { min-width: 0; }
  .heading h1 { margin: 0 0 2px; font-size: 19px; font-weight: 800; line-height: 1.25; }
  .heading p { margin: 0; font-size: 13.5px; font-weight: 600; color: ${accent}; }
  .section { margin-bottom: 16px; }
  .section:last-child { margin-bottom: 0; }
  .section-title { margin: 0 0 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: ${accent}; }
  .line { margin: 0 0 3px; font-size: 13px; color: ${theme.textMed}; }
  .line:last-child { margin-bottom: 0; }
  .text { margin: 0; font-size: 13.5px; line-height: 1.55; color: ${theme.text}; opacity: 0.88; white-space: pre-line; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .tag { font-size: 11.5px; font-weight: 600; color: ${accent}; background: ${accent}${theme.chipAlpha}; border-radius: 999px; padding: 5px 11px; }
  .divider { height: 1px; background: ${theme.divider}; margin: 20px 0; }
  .eyebrow { margin: 0 0 4px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: ${theme.textFaint}; }
  .detail-title { margin: 0 0 2px; font-size: 17px; font-weight: 800; }
  .detail-meta { margin: 0 0 12px; font-size: 12.5px; color: ${theme.textMed}; }
  .exp-item, .edu-item, .pf-item { margin-bottom: 12px; }
  .exp-item:last-child, .edu-item:last-child, .pf-item:last-child { margin-bottom: 0; }
  .item-title-row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
  .item-title { margin: 0; font-size: 13.5px; font-weight: 700; }
  .item-period { margin: 0; font-size: 11px; color: ${theme.textFaint}; white-space: nowrap; }
  .item-sub { margin: 2px 0 4px; font-size: 12px; color: ${theme.textMed}; }
  .item-desc { margin: 0; font-size: 12.5px; line-height: 1.5; color: ${theme.text}; opacity: 0.8; white-space: pre-line; }
  .pf-link { color: ${accent}; font-size: 12.5px; word-break: break-all; text-decoration: none; }
  .pf-link:hover { text-decoration: underline; }
  .footer { max-width: 440px; width: 100%; margin: 18px auto 0; text-align: center; }
  .open-btn { display: inline-block; width: 100%; box-sizing: border-box; background: ${accent}; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; border-radius: 12px; padding: 13px 18px; }
  .back-link { display: block; margin-top: 12px; font-size: 13px; font-weight: 600; color: ${theme.textMed}; text-decoration: none; }
  .tip { margin: 14px 0 0; font-size: 11.5px; line-height: 1.5; color: ${theme.textFaint}; }
</style>
</head>
<body>
<div>
  <div class="card">
    <div class="header">
      ${headerHtml}
    </div>
    ${bodyHtml}
  </div>
  <div class="footer">
    ${footerHtml}
  </div>
</div>
</body>
</html>`;
}

export function buildResumeShareHtml(resume, { shareUrl } = {}) {
  // Формат експорту — фіксований бренд-шаблон, завжди українською,
  // незалежно від поточної мови інтерфейсу застосунку.
  const t = LABELS.uk;
  const accent = ACCENTS[resume?.template] || ACCENTS.minimal;
  const theme = getColorTheme(resume?.colorScheme);
  const fullName = resume?.fullName || "";
  const role = resume?.role || "";

  const headerHtml = `
    <div class="avatar">${escapeHtml(initialsOf(fullName))}</div>
    <div class="heading">
      <h1>${escapeHtml(fullName)}</h1>
      ${role ? `<p>${escapeHtml(role)}</p>` : ""}
    </div>`;

  const age = calcAge(resume?.birthDate);

  const contactLines = [];
  if (age != null) contactLines.push(`<p class="line">${escapeHtml(t.age)}: ${escapeHtml(formatAge(age, "uk"))}</p>`);
  if (resume?.city) contactLines.push(`<p class="line">${escapeHtml(t.city)}: ${escapeHtml(resume.city)}</p>`);
  if (resume?.phone) {
    const label = resume.phone.trim().startsWith("@") ? t.telegram : t.phone;
    contactLines.push(`<p class="line">${escapeHtml(label)}: ${escapeHtml(resume.phone)}</p>`);
  }
  if (resume?.email) contactLines.push(`<p class="line">${escapeHtml(t.email)}: ${escapeHtml(resume.email)}</p>`);

  const educationHtml = (resume?.education || [])
    .map(
      (e) => `
      <div class="edu-item">
        ${e.degree ? `<p class="item-title">${escapeHtml(e.degree)}</p>` : ""}
        <p class="item-sub">${[e.school, e.period].filter(Boolean).map(escapeHtml).join(" · ")}</p>
      </div>`
    )
    .join("");

  const topHtml = `
    ${section(t.contacts, contactLines.join(""))}
    ${section(t.education, educationHtml)}`;

  const experienceHtml = (resume?.experience || [])
    .map(
      (e) => `
      <div class="exp-item">
        <div class="item-title-row">
          <p class="item-title">${escapeHtml([e.position, e.period].filter(Boolean).join(" "))}</p>
        </div>
        ${e.company ? `<p class="item-sub">${escapeHtml(e.company)}</p>` : ""}
        ${e.description ? `<p class="item-desc">${nl2br(e.description)}</p>` : ""}
      </div>`
    )
    .join("");

  const portfolioHtml = (resume?.portfolio || [])
    .map(
      (p) => `
      <div class="pf-item">
        ${p.title ? `<p class="item-title" style="margin-bottom:3px;">${escapeHtml(p.title)}</p>` : ""}
        ${p.url ? `<a class="pf-link" data-pdf-link="${escapeHtml(p.url)}" href="${escapeHtml(p.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(p.url)}</a>` : ""}
      </div>`
    )
    .join("");

  const detailHtml = `
    <div class="divider"></div>
    <p class="eyebrow">${escapeHtml(t.resumeEyebrow)}</p>
    ${section(t.aboutMe, resume?.summary ? `<p class="text">${nl2br(resume.summary)}</p>` : "")}
    ${section(t.experience, experienceHtml)}
    ${section(t.portfolio, portfolioHtml)}`;

  const footerHtml = `
    <a class="open-btn" data-pdf-link="${escapeHtml(shareUrl || buildAppHomeLink())}" href="${escapeHtml(shareUrl || buildAppHomeLink())}">${escapeHtml(t.openInTelegram)}</a>
    <a class="back-link" data-pdf-link="${escapeHtml(buildAppHomeLink())}" href="${escapeHtml(buildAppHomeLink())}">${escapeHtml(t.backToApp)}</a>
    <p class="tip">${escapeHtml(t.tip)}</p>`;

  const docTitle = `${fullName}${role ? " — " + role : ""}`;
  const html = shell({ accent, theme, docTitle, headerHtml, bodyHtml: topHtml + detailHtml, footerHtml });
  return { html, fileName: `${sanitizeFileName(fullName || "Resume")}.html` };
}

export function buildVacancyShareHtml(vacancy, { shareUrl } = {}) {
  // Формат експорту — фіксований бренд-шаблон, завжди українською,
  // незалежно від поточної мови інтерфейсу застосунку.
  const t = LABELS.uk;
  const accent = ACCENTS[vacancy?.template] || ACCENTS.minimal;
  const theme = getColorTheme(vacancy?.colorScheme);
  const company = vacancy?.company || "";
  const position = vacancy?.position || "";

  const headerHtml = `
    <div class="avatar">${escapeHtml(initialsOf(company || position))}</div>
    <div class="heading">
      <h1>${escapeHtml(company)}</h1>
      ${position ? `<p>${escapeHtml(position)}</p>` : ""}
    </div>`;

  const contactLines = [];
  if (vacancy?.city) contactLines.push(`<p class="line">${escapeHtml(t.city)}: ${escapeHtml(vacancy.city)}</p>`);
  if (vacancy?.contact) {
    const label = vacancy.contact.trim().startsWith("@") ? t.telegram : t.phone;
    contactLines.push(`<p class="line">${escapeHtml(label)}: ${escapeHtml(vacancy.contact)}</p>`);
  }

  const conditionLines = [];
  if (vacancy?.salary) conditionLines.push(`<p class="line">${escapeHtml(vacancy.salary)}</p>`);
  if (vacancy?.employmentType) conditionLines.push(`<p class="line">${escapeHtml(vacancy.employmentType)}</p>`);

  const tagsHtml = (vacancy?.tags || []).length
    ? `<div class="tags">${vacancy.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>`
    : "";

  const topHtml = `
    ${section(t.contacts, contactLines.join(""))}
    ${section(t.conditions, conditionLines.join(""))}
    ${section(t.technologies, tagsHtml)}`;

  const metaLine = [company, vacancy?.city, vacancy?.employmentType].filter(Boolean).join(" · ");

  const detailHtml = `
    <div class="divider"></div>
    <p class="eyebrow">${escapeHtml(t.vacancyEyebrow)}</p>
    <p class="detail-title">${escapeHtml(position)}</p>
    ${metaLine ? `<p class="detail-meta">${escapeHtml(metaLine)}</p>` : ""}
    ${vacancy?.salary ? `<p class="detail-meta" style="margin-top:-8px;">${escapeHtml(vacancy.salary)}</p>` : ""}
    ${section(t.description, vacancy?.description ? `<p class="text">${nl2br(vacancy.description)}</p>` : "")}
    ${section(t.requirements, vacancy?.requirements ? `<p class="text">${nl2br(vacancy.requirements)}</p>` : "")}
    ${section(t.technologies, tagsHtml)}`;

  const footerHtml = `
    <a class="open-btn" data-pdf-link="${escapeHtml(shareUrl || buildAppHomeLink())}" href="${escapeHtml(shareUrl || buildAppHomeLink())}">${escapeHtml(t.openInTelegram)}</a>
    <p class="tip">${escapeHtml(t.tip)}</p>`;

  const docTitle = [position, company].filter(Boolean).join(" — ");
  const html = shell({ accent, theme, docTitle, headerHtml, bodyHtml: topHtml + detailHtml, footerHtml });
  return { html, fileName: `${sanitizeFileName([position, company].filter(Boolean).join(" ") || "Vacancy")}.html` };
}
