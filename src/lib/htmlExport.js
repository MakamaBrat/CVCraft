// Генерує самодостатній HTML-файл з DOM-вузла за id (наприклад #resume-doc
// чи #vacancy-doc): клонує вузол, вшиває всі CSS-правила зі сторінки в
// один <style>, підвантажує зовнішні стилі (наприклад шрифт Google Fonts)
// окремим <link>, і зберігає посилання на живі елементи (YouTube/Vimeo/PDF/
// Figma iframe) — на відміну від колишнього PDF, HTML-файл їх чудово
// показує, тому статичні "для PDF" заглушки (data-pdf-only) тут просто
// прибираються, а живі версії (data-pdf-hide) лишаються видимими.

function sanitizeFileName(name) {
  return (name || "document")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

// Абсолютизуємо src/href, які в розмітці могли бути відносними
// (наприклад "/assets/..."), — інакше після збереження й відкриття файлу
// з диска (file://) вони вестимуть у нікуди.
function absolutizeUrls(root) {
  root.querySelectorAll("img[src]").forEach((el) => el.setAttribute("src", el.src));
  root.querySelectorAll("iframe[src]").forEach((el) => el.setAttribute("src", el.src));
  root.querySelectorAll("video[src]").forEach((el) => el.setAttribute("src", el.src));
  root.querySelectorAll("a[href]").forEach((el) => el.setAttribute("href", el.href));
}

// Прибираємо статичні "для PDF" заглушки й лишаємо натомість живі
// елементи (iframe з відео, вбудований PDF-перегляд, Figma) видимими —
// у HTML, на відміну від PDF, вони працюють як є.
function swapLiveForStatic(root) {
  root.querySelectorAll('[data-pdf-only="true"]').forEach((el) => el.remove());
  root.querySelectorAll('[data-pdf-hide="true"]').forEach((el) => {
    el.removeAttribute("data-pdf-hide");
    el.style.display = "";
  });
}

// Стилі сторінки (Tailwind-білд тощо) зі свого ж домену вшиваємо
// текстом напряму в файл, щоб він виглядав однаково без бекенду. Стилі
// із чужого домену (шрифт Google Fonts підключений через <link>)
// прочитати через cssRules не можна (CORS) — для них лишаємо звичайний
// <link>, браузер підтягне його сам, якщо є інтернет.
function collectStyles() {
  let inlineCss = "";
  const externalHrefs = new Set();

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      if (sheet.cssRules) {
        inlineCss += Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join("\n");
        inlineCss += "\n";
        continue;
      }
    } catch {
      // cross-origin stylesheet — cssRules недоступні, беремо href нижче
    }
    if (sheet.href) externalHrefs.add(sheet.href);
  }

  return { inlineCss, externalHrefs: Array.from(externalHrefs) };
}

export async function generateHtmlFromElement(elementId, fileNameBase, backgroundColor = "#ffffff") {
  const node = document.getElementById(elementId);
  if (!node) throw new Error(`html_source_not_found:${elementId}`);

  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // не критично
    }
  }

  const clone = node.cloneNode(true);
  swapLiveForStatic(clone);
  absolutizeUrls(clone);

  const { inlineCss, externalHrefs } = collectStyles();
  const externalLinksHtml = externalHrefs.map((href) => `<link rel="stylesheet" href="${href}">`).join("\n    ");
  const title = sanitizeFileName(fileNameBase) || "document";

  const html = `<!doctype html>
<html lang="uk">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    ${externalLinksHtml}
    <style>
      html, body { margin: 0; padding: 0; background: ${backgroundColor}; }
      body { display: flex; justify-content: center; }
      #export-root { max-width: 720px; width: 100%; }
      ${inlineCss}
    </style>
  </head>
  <body>
    <div id="export-root">${clone.outerHTML}</div>
  </body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const fileName = `${title}.html`;
  return { blob, fileName };
}

export async function generateResumeHtml(resume) {
  const bg = resume?.colorScheme === "dark" ? "#161616" : "#ffffff";
  return generateHtmlFromElement("resume-doc", resume?.fullName, bg);
}

export async function generateVacancyHtml(vacancy) {
  const bg = vacancy?.colorScheme === "dark" ? "#161616" : "#ffffff";
  return generateHtmlFromElement("vacancy-doc", `${vacancy?.position || ""} ${vacancy?.company || ""}`, bg);
}
