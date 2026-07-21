// Генерує самодостатній PDF-файл: html2canvas робить точний скріншот
// резюме/вакансії (це розв'язує аватарку/фон/кадр гіфки/кольори, бо це
// просто пікселі, а не залежність від CSS чи мережі) і картинка стає
// єдиною сторінкою PDF через jsPDF.
//
// Поверх цього скріншоту (а не замість нього) додаються прозорі
// клікабельні зони — кнопки соцмереж, App Store, Figma, і так само
// відео (YouTube/Vimeo/пряме відео): у справжньому PDF це посилання-
// анотації (jsPDF .link()), тому клік по кнопці чи по обкладинці відео
// відкриває справжнє посилання у застосунку перегляду PDF (Acrobat,
// вбудований переглядач у Telegram/iOS/Android, браузер тощо), а не
// програє відео прямо у файлі — так однаковіше й надійніше (не залежить
// від того, чи дозволяє переглядач вбудовані відео). Координати
// рахуються у пікселях сторінки, тому лишаються точно під картинкою
// незалежно від масштабу перегляду.

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

// Прямокутники (у px відносно розміру node) для клікабельних кнопок —
// елементи з data-pdf-link, видимі у стані "для скріншоту".
function collectRectPixels(elements, nodeRect) {
  return elements
    .map((el) => {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return null;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return null;
      return {
        href: el.getAttribute("data-pdf-link"),
        left: r.left - nodeRect.left,
        top: r.top - nodeRect.top,
        width: r.width,
        height: r.height,
      };
    })
    .filter(Boolean);
}

export async function generateHtmlFromElement(elementId, fileNameBase, backgroundColor = "#ffffff") {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

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
  // нижче, і координати клікабельних зон/відео більше не збігалися б зі
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
  // їх і знімає html2canvas, а клікабельною зоною поверх стане
  // посилання-анотація в PDF (як для решти кнопок), не сам iframe.
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

  let dataUrl, linkRects, canvasWidth, canvasHeight;
  try {
    const canvas = await captureCanvas(node, html2canvas, backgroundColor);
    const nodeRect = node.getBoundingClientRect();
    const linkEls = Array.from(node.querySelectorAll("[data-pdf-link]"));
    linkRects = collectRectPixels(linkEls, nodeRect);
    dataUrl = canvas.toDataURL("image/png");
    canvasWidth = nodeRect.width;
    canvasHeight = nodeRect.height;
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

  const title = sanitizeFileName(fileNameBase) || "document";

  // Сторінка PDF у тих самих пропорціях, що й скріншот, у "points"
  // (одиниця jsPDF за замовчуванням) — 1px скріншоту = 1pt сторінки,
  // тому анотації-посилання лягають точно під картинку без перерахунку.
  const pdf = new jsPDF({
    orientation: canvasHeight >= canvasWidth ? "portrait" : "landscape",
    unit: "pt",
    format: [canvasWidth, canvasHeight],
  });
  pdf.addImage(dataUrl, "PNG", 0, 0, canvasWidth, canvasHeight, undefined, "FAST");

  linkRects.forEach(({ href, left, top, width, height }) => {
    if (!href) return;
    pdf.link(left, top, width, height, { url: href });
  });

  const blob = pdf.output("blob");
  const fileName = `${title}.pdf`;
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
