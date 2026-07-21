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
// з диска (file://) вони вестимуть у нікуди. Атрибут crossorigin теж
// прибираємо: він був потрібен лише html2canvas для безпечного читання
// пікселів у canvas, а в реальному <img>/<video> він, навпаки, шкодить —
// браузер вимагає від сервера коректних CORS-заголовків і, якщо їх
// немає (а в більшості картинок/відео з чужих доменів їх немає), просто
// НЕ завантажує ресурс — саме тому аватарка, обкладинка гіфки, фон і
// відео могли виглядати зламаними в експортованому файлі.
function absolutizeUrls(root) {
  root.querySelectorAll("img[src]").forEach((el) => {
    el.setAttribute("src", el.src);
    el.removeAttribute("crossorigin");
  });
  root.querySelectorAll("iframe[src]").forEach((el) => el.setAttribute("src", el.src));
  root.querySelectorAll("video[src], video source[src]").forEach((el) => {
    el.setAttribute("src", el.src);
    el.removeAttribute("crossorigin");
  });
  root.querySelectorAll("video").forEach((el) => el.removeAttribute("crossorigin"));
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

// Для стилів зі своїм href (зібраний Tailwind-бандл, шрифт Google Fonts)
// лишаємо звичайний <link> — так усі url(...) всередині CSS (шрифти,
// фонові картинки-іконки тощо) резолвляться відносно СПРАВЖНЬОГО файлу
// стилів, а не відносно нашого HTML-файлу, де відносний шлях був би
// битим. cssText-копію використовуємо лише для <style>-тегів без href
// (напр. інжектовані Vite у dev-режимі).
function collectStyles() {
  let inlineCss = "";
  const externalHrefs = new Set();

  for (const sheet of Array.from(document.styleSheets)) {
    if (sheet.href) {
      externalHrefs.add(sheet.href);
      continue;
    }
    try {
      if (sheet.cssRules) {
        inlineCss += Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join("\n");
        inlineCss += "\n";
      }
    } catch {
      // cross-origin stylesheet без href (рідкісний випадок) — пропускаємо
    }
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
