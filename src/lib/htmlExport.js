// Генерує самодостатній HTML-файл: береться той самий підхід, що раніше
// був для PDF (html2canvas робить точний скріншот резюме/вакансії — це
// разом розв'язує аватарку/фон/кадр гіфки/кольори, бо це просто пікселі,
// а не залежність від CSS чи мережі), картинка вшивається в base64 —
// файл повністю самодостатній і відкривається навіть у пісочниці на
// кшталт iOS/Android Quick Look, без інтернету.
//
// Поверх цього скріншоту (а не замість нього) додаються прозорі
// клікабельні зони — кнопки соцмереж, App Store, Figma, і так само
// відео (YouTube/Vimeo/пряме відео): клік по ньому відкриває посилання
// у новій вкладці/застосунку, а не програє відео прямо у файлі — так
// однаковіше й надійніше (не залежить від того, чи дозволяє iframe
// конкретний переглядач файлу). Координати overlay-ів рахуються у
// відсотках від розміру скріншоту, тому лишаються на місці, навіть
// якщо файл відкрити на іншій ширині екрана.

function sanitizeFileName(name) {
  return (name || "document")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

// Картинки з чужих доменів без CORS-заголовків інколи "заражають" (taint)
// canvas навіть з useCORS:true. У такому разі canvas.toDataURL() кидає
// SecurityError і ламає весь скріншот. Щоб файл генерувався завжди,
// пробуємо ще раз, попередньо приховавши всі такі "ризиковані" картинки
// (позначені атрибутом crossOrigin у розмітці).
async function captureCanvas(node, html2canvas, backgroundColor) {
  const opts = { scale: 2, backgroundColor, useCORS: true };
  try {
    const canvas = await html2canvas(node, opts);
    canvas.toDataURL("image/png");
    return canvas;
  } catch (err) {
    const riskyEls = Array.from(node.querySelectorAll("img[crossorigin]"));
    if (!riskyEls.length) throw err;
    const prevDisplay = riskyEls.map((el) => el.style.display);
    riskyEls.forEach((el) => {
      el.style.display = "none";
    });
    try {
      const canvas = await html2canvas(node, opts);
      canvas.toDataURL("image/png");
      return canvas;
    } finally {
      riskyEls.forEach((el, i) => {
        el.style.display = prevDisplay[i];
      });
    }
  }
}

// Прямокутники (у % від розміру node) для клікабельних кнопок —
// елементи з data-pdf-link, видимі у стані "для скріншоту".
function collectRectPercents(elements, nodeRect) {
  return elements
    .map((el) => {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return null;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return null;
      return {
        el,
        leftPct: ((r.left - nodeRect.left) / nodeRect.width) * 100,
        topPct: ((r.top - nodeRect.top) / nodeRect.height) * 100,
        widthPct: (r.width / nodeRect.width) * 100,
        heightPct: (r.height / nodeRect.height) * 100,
      };
    })
    .filter(Boolean);
}

function escapeAttr(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

export async function generateHtmlFromElement(elementId, fileNameBase, backgroundColor = "#ffffff") {
  const { default: html2canvas } = await import("html2canvas");

  const node = document.getElementById(elementId);
  if (!node) throw new Error(`html_source_not_found:${elementId}`);

  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // не критично
    }
  }

  // html2canvas погано вміє коректно рендерити `text-overflow: ellipsis`
  // разом з кастомним веб-шрифтом (Manrope) — рядки з класом .truncate
  // (ПІБ/посада, назви кнопок) на скріншоті виходили обрізаними чи
  // "наїжджали" одна на одну. Знімаємо саме ellipsis і вирівнюємо
  // line-height, АЛЕ лишаємо white-space:nowrap (як було) — щоб рядок не
  // переносився на другий і не міняв висоту картки: це зсунуло б усе, що
  // нижче, і координати overlay-кнопок/відео більше не збігалися б зі
  // скріншотом. Довгий текст просто акуратно "виходить" за межі пігулки
  // одним рядком замість зламаного рендеру ellipsis.
  const truncatedEls = Array.from(node.querySelectorAll(".truncate"));
  const prevTruncateCss = truncatedEls.map((el) => el.style.cssText);
  truncatedEls.forEach((el) => {
    el.style.textOverflow = "clip";
    el.style.lineHeight = "normal";
  });

  // Ховаємо "живі" iframe/відео (data-pdf-hide) і показуємо статичні
  // "для знімку" картки (data-pdf-only, обкладинка + кнопка Play) — саме
  // їх і знімає html2canvas, а клікабельною зоною поверх стане звичайне
  // посилання (як для решти кнопок), не сам iframe.
  const hideEls = Array.from(node.querySelectorAll('[data-pdf-hide="true"]'));
  const prevHideDisplay = hideEls.map((el) => el.style.display);
  hideEls.forEach((el) => {
    el.style.display = "none";
  });
  const showEls = Array.from(node.querySelectorAll('[data-pdf-only="true"]'));
  const prevShowDisplay = showEls.map((el) => el.style.display);
  showEls.forEach((el) => {
    el.style.display = "";
  });

  let dataUrl, linkRects;
  try {
    const canvas = await captureCanvas(node, html2canvas, backgroundColor);
    const nodeRect = node.getBoundingClientRect();
    const linkEls = Array.from(node.querySelectorAll("[data-pdf-link]"));
    linkRects = collectRectPercents(linkEls, nodeRect);
    dataUrl = canvas.toDataURL("image/png");
  } finally {
    hideEls.forEach((el, i) => {
      el.style.display = prevHideDisplay[i];
    });
    showEls.forEach((el, i) => {
      el.style.display = prevShowDisplay[i];
    });
    truncatedEls.forEach((el, i) => {
      el.style.cssText = prevTruncateCss[i];
    });
  }

  // Клікабельні прозорі зони поверх кнопок (соцмережі, App Store, Figma,
  // відео) — клік відкриває справжнє посилання в новій вкладці.
  const linkOverlaysHtml = linkRects
    .map(
      ({ el, leftPct, topPct, widthPct, heightPct }) => `
      <a href="${escapeAttr(el.getAttribute("data-pdf-link"))}" target="_blank" rel="noreferrer"
         style="position:absolute;left:${leftPct}%;top:${topPct}%;width:${widthPct}%;height:${heightPct}%;display:block;"></a>`
    )
    .join("");

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
      #export-root { position: relative; max-width: 720px; width: 100%; }
      #export-root > img { display: block; width: 100%; height: auto; }
    </style>
  </head>
  <body>
    <div id="export-root">
      <img src="${dataUrl}" alt="${title}" />
      ${linkOverlaysHtml}
    </div>
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
