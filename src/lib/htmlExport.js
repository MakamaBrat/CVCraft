// Генерує самодостатній HTML-файл: береться той самий підхід, що раніше
// був для PDF (html2canvas робить точний скріншот резюме/вакансії — це
// разом розв'язує аватарку/фон/кадр гіфки/кольори, бо це просто пікселі,
// а не залежність від CSS чи мережі), картинка вшивається в base64 —
// файл повністю самодостатній і відкривається навіть у пісочниці на
// кшталт iOS/Android Quick Look, без інтернету.
//
// Поверх цього скріншоту (а не замість нього) додаються "живі" деталі,
// яких на статичній картинці бути не може:
//   - кнопки (соцмережі, App Store, Figma-картка) — прозорі клікабельні
//     зони з посиланням поверх намальованої кнопки;
//   - відео (YouTube/Vimeo/пряме відео) — справжній плеєр поверх
//     скріншоту обкладинки, працює з інтернетом як і раніше.
// Координати overlay-ів рахуються у відсотках від розміру скріншоту, тому
// лишаються на місці, навіть якщо файл відкрити на іншій ширині екрана.

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

  // Позиції "живих" елементів (відео/iframe) записуємо ДО того, як їх
  // приховаємо для скріншоту — контейнер живого й статичного варіанту
  // однакового розміру, тому координати збігаються.
  const liveWrappers = Array.from(node.querySelectorAll('[data-pdf-hide="true"]'));
  const nodeRectBefore = node.getBoundingClientRect();
  const liveRects = liveWrappers.map((el) => {
    const r = el.getBoundingClientRect();
    return {
      html: el.innerHTML,
      leftPct: ((r.left - nodeRectBefore.left) / nodeRectBefore.width) * 100,
      topPct: ((r.top - nodeRectBefore.top) / nodeRectBefore.height) * 100,
      widthPct: (r.width / nodeRectBefore.width) * 100,
      heightPct: (r.height / nodeRectBefore.height) * 100,
    };
  });

  const prevHideDisplay = liveWrappers.map((el) => el.style.display);
  liveWrappers.forEach((el) => {
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
    liveWrappers.forEach((el, i) => {
      el.style.display = prevHideDisplay[i];
    });
    showEls.forEach((el, i) => {
      el.style.display = prevShowDisplay[i];
    });
  }

  // Клікабельні прозорі зони поверх кнопок (соцмережі, App Store, Figma).
  const linkOverlaysHtml = linkRects
    .map(
      ({ el, leftPct, topPct, widthPct, heightPct }) => `
      <a href="${escapeAttr(el.getAttribute("data-pdf-link"))}" target="_blank" rel="noreferrer"
         style="position:absolute;left:${leftPct}%;top:${topPct}%;width:${widthPct}%;height:${heightPct}%;display:block;"></a>`
    )
    .join("");

  // Справжні відео/iframe поверх обкладинки на скріншоті — працюють з
  // інтернетом як і раніше, просто тепер накладені на картинку, а не
  // замінюють весь документ.
  const liveOverlaysHtml = liveRects
    .filter((r) => r.widthPct > 0 && r.heightPct > 0)
    .map(
      (r) => `
      <div style="position:absolute;left:${r.leftPct}%;top:${r.topPct}%;width:${r.widthPct}%;height:${r.heightPct}%;">${r.html}</div>`
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
      #export-root iframe, #export-root video { width: 100%; height: 100%; border: 0; }
    </style>
  </head>
  <body>
    <div id="export-root">
      <img src="${dataUrl}" alt="${title}" />
      ${linkOverlaysHtml}
      ${liveOverlaysHtml}
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
