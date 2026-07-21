// Генерує повністю самодостатній HTML-файл з DOM-вузла за id (наприклад
// #resume-doc чи #vacancy-doc): CSS вшивається текстом (а не посиланням),
// а картинки (аватар, фон, гіфки) перекодовуються у base64 (data:) прямо
// в розмітку. Це критично важливо, бо типовий спосіб відкрити файл —
// iOS/Android Quick Look (той самий попередній перегляд файлу з кнопкою
// "Готово", БЕЗ адресного рядка) — це пісочниця, яка взагалі блокує будь-
// які мережеві запити зсередини HTML: ні <link rel="stylesheet">, ні
// <img src="https://...">, ні зовнішній шрифт вантажитись не будуть, і
// сторінка виглядає геть неоформленою (як голий текст), а картинки —
// битими іконками. Єдине, що працює будь-де без інтернету, — це вміст,
// вшитий прямо у файл: <style> текстом і data:-картинки.
// Виняток — важкі речі, які фізично не влізуть у файл (відео, iframe
// YouTube/Vimeo/Figma): вони лишаються звичайними посиланнями/iframe і
// працюють тільки якщо файл відкрити у справжньому браузері з інтернетом.

function sanitizeFileName(name) {
  return (name || "document")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

// Максимальний розмір однієї картинки, яку варто вшивати в base64 —
// щоб великі фото/гіфки не роздували файл понад ліміт Telegram на
// відправку документа ботом.
const MAX_INLINE_IMAGE_BYTES = 3_000_000;

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("blob_read_failed"));
    reader.readAsDataURL(blob);
  });
}

// Завантажує картинку і повертає її як data: URL. Якщо сервер не віддає
// потрібних CORS-заголовків (fetch впаде) або картинка завелика —
// повертає null, і виклик лишає оригінальне посилання як є (працюватиме
// тільки з інтернетом, але це краще, ніж зовсім нічого).
async function fetchAsDataUrl(url) {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (blob.size > MAX_INLINE_IMAGE_BYTES) return null;
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

// Замінює всі src/background-image картинки в дереві на base64, і
// абсолютизує все, що лишилось зовнішнім посиланням (відео, iframe) —
// інакше відносні шляхи на кшталт "/assets/..." вестимуть у нікуди після
// збереження файлу на диск.
async function inlineImages(root) {
  const imgEls = Array.from(root.querySelectorAll("img[src]"));
  await Promise.all(
    imgEls.map(async (el) => {
      const dataUrl = await fetchAsDataUrl(el.src);
      el.setAttribute("src", dataUrl || el.src);
      el.removeAttribute("crossorigin");
    })
  );

  const bgEls = Array.from(root.querySelectorAll('[style*="background-image"]'));
  await Promise.all(
    bgEls.map(async (el) => {
      const match = el.style.backgroundImage.match(/url\((['"]?)(.*?)\1\)/);
      if (!match) return;
      const dataUrl = await fetchAsDataUrl(match[2]);
      if (dataUrl) el.style.backgroundImage = el.style.backgroundImage.replace(match[0], `url("${dataUrl}")`);
    })
  );

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
// у HTML, на відміну від PDF, вони працюють як є (щоправда лише з
// інтернетом і у звичайному браузері, не в Quick Look).
function swapLiveForStatic(root) {
  root.querySelectorAll('[data-pdf-only="true"]').forEach((el) => el.remove());
  root.querySelectorAll('[data-pdf-hide="true"]').forEach((el) => {
    el.removeAttribute("data-pdf-hide");
    el.style.display = "";
  });
}

// Вшиваємо CSS ТЕКСТОМ (а не через <link>), щоб оформлення (Tailwind-
// класи, кольори, шрифт) працювало навіть у пісочниці Quick Look, де
// жоден мережевий запит не проходить. Для стилів із чужого домену
// (шрифт Google Fonts, підключений через <link>) cssRules напряму
// недоступні через CORS — тому для них теж робимо fetch() і вшиваємо
// текст CSS-файлу (Google Fonts віддає CSS з дозволом на CORS).
async function collectStyles() {
  let css = "";

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      if (sheet.cssRules) {
        css += Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join("\n");
        css += "\n";
        continue;
      }
    } catch {
      // cssRules недоступні (CORS) — спробуємо дістати текст через fetch нижче
    }
    if (sheet.href) {
      try {
        const res = await fetch(sheet.href, { mode: "cors" });
        if (res.ok) css += (await res.text()) + "\n";
      } catch {
        // немає CORS навіть на fetch — цей шматок стилів (зазвичай шрифт)
        // просто не потрапить у файл; решта оформлення відпрацює й так
      }
    }
  }

  return css;
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
  await inlineImages(clone);

  const css = await collectStyles();
  const title = sanitizeFileName(fileNameBase) || "document";

  const html = `<!doctype html>
<html lang="uk">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      html, body { margin: 0; padding: 0; background: ${backgroundColor}; }
      body { display: flex; justify-content: center; }
      #export-root { max-width: 720px; width: 100%; }
      ${css}
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
