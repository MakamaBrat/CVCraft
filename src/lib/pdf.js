// Генерує PDF з DOM-вузла за id (наприклад #resume-doc чи #vacancy-doc)
// через html2canvas + jsPDF. Працює тільки в браузері, тому імпортується
// лінькво (dynamic import), щоб не роздувати основний бандл для тих, хто
// ніколи не тисне "Поділитися".

function sanitizeFileName(name) {
  return (name || "document")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

// Картинки з чужих доменів без CORS-заголовків (обкладинки YouTube/Vimeo,
// іконки застосунків тощо) інколи "заражають" (taint) canvas навіть з
// useCORS:true — залежить від браузера й того, чи картинка вже була в
// кеші без CORS-режиму. У такому разі canvas.toDataURL() кидає
// SecurityError і ламає ВЕСЬ PDF, а не тільки цю картинку. Щоб PDF
// генерувався завжди, пробуємо ще раз, попередньо приховавши всі такі
// "ризиковані" картинки (позначені атрибутом crossOrigin у розмітці).
async function captureCanvas(node, html2canvas, backgroundColor) {
  const opts = { scale: 2, backgroundColor, useCORS: true };
  try {
    const canvas = await html2canvas(node, opts);
    canvas.toDataURL("image/png"); // тут і "спливає" SecurityError, якщо він є
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

// Елементи, позначені data-pdf-link="https://...", стають клікабельними
// зонами у самому PDF (jsPDF link-анотація поверх картинки), а не просто
// написаним текстом посилання. Розміри/позиція беруться з реального
// layout-у на екрані (getBoundingClientRect), тому важливо викликати це
// ПІСЛЯ того, як html2canvas показав/сховав data-pdf-hide/data-pdf-only
// елементи (той самий стан, що й на знімку).
function collectLinkRects(node) {
  const nodeRect = node.getBoundingClientRect();
  return Array.from(node.querySelectorAll("[data-pdf-link]"))
    .map((el) => {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return null;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return null;
      return {
        url: el.getAttribute("data-pdf-link"),
        x: r.left - nodeRect.left,
        y: r.top - nodeRect.top,
        width: r.width,
        height: r.height,
      };
    })
    .filter((l) => l && l.url);
}

// Елементи, позначені data-pdf-avoid-break="true" (заголовок з фото,
// кожен запис досвіду/освіти, кожна картка портфоліо тощо) — це
// "неподільні" блоки: розрізати їх точно по межі сторінки не можна,
// інакше текст всередині показує лише верхню/нижню половину рядків, а
// картки (наприклад, кнопка Instagram/TikTok) виглядають обірваними.
// Повертаємо їх межі (top/bottom), щоб підбирати точку розриву сторінки
// так, щоб вона не проходила крізь жоден з цих блоків.
function collectAvoidBreakRects(node) {
  const nodeRect = node.getBoundingClientRect();
  return Array.from(node.querySelectorAll('[data-pdf-avoid-break="true"]'))
    .map((el) => {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return null;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return null;
      return { top: r.top - nodeRect.top, bottom: r.bottom - nodeRect.top };
    })
    .filter(Boolean);
}

// Рахує межі кожної сторінки (у pt, від верху повного зображення) так,
// щоб жодна точка розриву не потрапляла всередину "неподільного" блоку.
// Якщо звичайна межа (position + pageHeight) перетинає такий блок —
// зсуваємо розрив вище, до верху цього блоку: цілком переносимо його на
// наступну сторінку, а знизу поточної лишається трохи фону (не текст, що
// зникає чи ріжеться навпіл).
function computePageBreaks(imgHeight, pageHeight, avoidRects) {
  const breaks = [];
  let cursor = 0;
  const EPS = 0.5;
  while (cursor < imgHeight - EPS) {
    let cut = Math.min(cursor + pageHeight, imgHeight);
    if (cut < imgHeight - EPS) {
      const crossing = avoidRects.filter((r) => r.top < cut - EPS && r.bottom > cut + EPS);
      if (crossing.length) {
        const earliestTop = Math.min(...crossing.map((r) => r.top));
        // Зсуваємо розрив тільки якщо на поточній сторінці й так лишається
        // достатньо контенту — інакше (блок сам по собі більший за
        // сторінку) розрив довелось би зсунути аж до cursor, тобто
        // сторінка була б порожньою, а це нескінченний цикл/марна сторінка.
        if (earliestTop > cursor + Math.min(60, pageHeight * 0.15)) {
          cut = earliestTop;
        }
      }
    }
    breaks.push(cut);
    cursor = cut;
  }
  return breaks;
}

function addLinkAnnotations(pdf, linkRects, cssToPtScale, pageBreaks) {
  for (const link of linkRects) {
    const xPt = link.x * cssToPtScale;
    const yTopPt = link.y * cssToPtScale;
    const wPt = link.width * cssToPtScale;
    const hPt = link.height * cssToPtScale;

    // Посилання, що потрапляють точно на межу сторінки, розбиваємо між
    // сторінками — інакше клікабельна зона на першій сторінці "з'їдала" б
    // область, що фізично надрукована вже на наступній.
    let remainingTop = yTopPt;
    let remainingHeight = hPt;
    let pageIndex = 0;
    while (remainingHeight > 0 && pageIndex < pageBreaks.length) {
      const pageTop = pageIndex === 0 ? 0 : pageBreaks[pageIndex - 1];
      const pageBottom = pageBreaks[pageIndex];
      if (remainingTop < pageBottom - 1e-6) {
        const yOnPage = remainingTop - pageTop;
        const hOnPage = Math.min(remainingHeight, pageBottom - remainingTop);
        if (hOnPage > 0) {
          pdf.setPage(pageIndex + 1);
          pdf.link(xPt, yOnPage, wPt, hOnPage, { url: link.url });
        }
        remainingTop += hOnPage;
        remainingHeight -= hOnPage;
      }
      pageIndex += 1;
    }
  }
}

export async function generatePdfFromElement(elementId, fileNameBase, backgroundColor = "#ffffff") {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);

  const node = document.getElementById(elementId);
  if (!node) throw new Error(`pdf_source_not_found:${elementId}`);

  // Відео/соцмережі/PDF/Figma всередині документа мають два DOM-варіанти:
  // "живий" (iframe) — ховаємо на час знімку, бо html2canvas не вміє
  // знімати сторонні iframe (то порожнє місце, то взагалі SecurityError,
  // що ламає весь PDF); і статичний "для PDF" (обкладинка/іконка +
  // посилання) — показуємо натомість.
  const hideEls = Array.from(node.querySelectorAll('[data-pdf-hide="true"]'));
  const prevDisplay = hideEls.map((el) => el.style.display);
  hideEls.forEach((el) => {
    el.style.display = "none";
  });

  const showEls = Array.from(node.querySelectorAll('[data-pdf-only="true"]'));
  const prevShowDisplay = showEls.map((el) => el.style.display);
  showEls.forEach((el) => {
    el.style.display = "";
  });

  try {
    // html2canvas може стартувати ДО того, як браузер докачає веб-шрифт
    // Manrope (він підключений через <link> у index.html, без preload).
    // Якщо це станеться, canvas намалюється фолбек-шрифтом з іншими
    // метриками висоти рядка, тоді як контейнер вже свёрстаний під
    // Manrope — рядки тексту "наїжджають" один на одного й на елементи
    // під ними (border, наступний блок). document.fonts.ready гарантує,
    // що на момент рендеру потрібний шрифт вже завантажений і застосований.
    if (document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {
        // не критично — рендеримо з тим, що встигло завантажитись
      }
    }

    const canvas = await captureCanvas(node, html2canvas, backgroundColor);
    // DOM ще в тому самому стані, що й на знімку (pdf-hide/pdf-only вже
    // застосовані) — саме зараз координати клікабельних зон та "неподільних"
    // блоків коректні.
    const linkRects = collectLinkRects(node);
    const avoidBreakRectsCss = collectAvoidBreakRects(node);
    const nodeCssWidth = node.getBoundingClientRect().width || node.offsetWidth;

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const cssToPtScale = imgWidth / nodeCssWidth; // css-пікселі елемента -> pt у PDF

    const avoidBreakRects = avoidBreakRectsCss.map((r) => ({
      top: r.top * cssToPtScale,
      bottom: r.bottom * cssToPtScale,
    }));

    // Розриви сторінок підібрані так, щоб не проходити крізь заголовок,
    // запис досвіду/освіти чи картку портфоліо — замість фіксованого кроку
    // pageHeight, який міг розрізати текст чи картку рівно навпіл.
    const pageBreaks = computePageBreaks(imgHeight, pageHeight, avoidBreakRects);

    pageBreaks.forEach((pageBottom, i) => {
      const pageTop = i === 0 ? 0 : pageBreaks[i - 1];
      const position = -pageTop;
      if (i > 0) pdf.addPage();
      pdf.setFillColor(backgroundColor);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    });

    addLinkAnnotations(pdf, linkRects, cssToPtScale, pageBreaks);

    const blob = pdf.output("blob");
    const fileName = `${sanitizeFileName(fileNameBase) || "document"}.pdf`;
    return { blob, fileName };
  } finally {
    hideEls.forEach((el, i) => {
      el.style.display = prevDisplay[i];
    });
    showEls.forEach((el, i) => {
      el.style.display = prevShowDisplay[i];
    });
  }
}

export async function generateResumePdf(resume) {
  const bg = resume?.colorScheme === "dark" ? "#161616" : "#ffffff";
  return generatePdfFromElement("resume-doc", resume?.fullName, bg);
}

export async function generateVacancyPdf(vacancy) {
  const bg = vacancy?.colorScheme === "dark" ? "#161616" : "#ffffff";
  return generatePdfFromElement("vacancy-doc", `${vacancy?.position || ""} ${vacancy?.company || ""}`, bg);
}
