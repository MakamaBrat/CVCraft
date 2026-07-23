import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { buildResumeShareHtml, buildVacancyShareHtml } from "./shareTemplate.js";

function sanitizeFileName(name) {
  return (name || "document")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

// Чекаємо завантаження всіх <img> всередині елемента, який будемо
// знімати html2canvas'ом — інакше на знімку можуть лишитись порожні
// прямокутники там, де картинка ще не встигла підвантажитись (аватар,
// фон, обкладинки відео, favicon-и посилань тощо).
function waitForImages(root) {
  const imgs = Array.from(root.querySelectorAll("img"));
  return Promise.all(
    imgs.map(
      (img) =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : new Promise((resolve) => {
              img.addEventListener("load", resolve, { once: true });
              img.addEventListener("error", resolve, { once: true });
              // страховка: одна зависла картинка не має блокувати експорт назавжди
              setTimeout(resolve, 4000);
            })
    )
  );
}

// Wizard.jsx позначає "живі" елементи (iframe/video/audio), які
// html2canvas не вміє коректно знімати, атрибутом data-pdf-hide, а
// статичні картки-заглушки для них — атрибутом data-pdf-only (за
// замовчуванням приховані через inline style). Перед знімком міняємо їх
// видимість місцями, після знімку — повертаємо як було.
function swapForCapture(root) {
  const hideEls = Array.from(root.querySelectorAll("[data-pdf-hide]"));
  const onlyEls = Array.from(root.querySelectorAll("[data-pdf-only]"));
  const prevHide = hideEls.map((el) => el.style.display);
  const prevOnly = onlyEls.map((el) => el.style.display);

  hideEls.forEach((el) => {
    el.style.display = "none";
  });
  onlyEls.forEach((el) => {
    el.style.display = "block";
  });

  return function restore() {
    hideEls.forEach((el, i) => {
      el.style.display = prevHide[i];
    });
    onlyEls.forEach((el, i) => {
      el.style.display = prevOnly[i];
    });
  };
}

// Збирає прямокутники всіх елементів портфоліо (Wizard.jsx позначає їх
// data-pdf-link="<url>") у координатах "CSS-пікселі відносно контейнера
// резюме" — саме в цій системі координат ми потім рахуємо, куди в PDF
// накласти клікабельне посилання.
function collectLinkRects(root) {
  const containerRect = root.getBoundingClientRect();
  const nodes = Array.from(root.querySelectorAll("[data-pdf-link]"));
  return nodes
    .map((el) => {
      const url = el.getAttribute("data-pdf-link");
      if (!url) return null;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return null; // прихований елемент — пропускаємо
      return {
        url,
        x: r.left - containerRect.left,
        y: r.top - containerRect.top,
        width: r.width,
        height: r.height,
      };
    })
    .filter(Boolean);
}

// Перебирає всі елементи документа й для кожної унікальної комбінації
// шрифт/накреслення/стиль явно просить браузер завантажити її
// (document.fonts.load), а тоді чекає document.fonts.ready. Це потрібно,
// бо саме "жирні" накреслення (заголовки, назви) частіше не встигають
// довантажитись до моменту знімку — а якщо конкретне накреслення не
// завантажене, браузер малює його синтетично (подвоєним/зсунутим
// контуром), що і виглядає як "роздвоєний" текст на PDF.
async function warmUpFonts(root) {
  if (!("fonts" in document)) return;

  const seen = new Set();
  const nodes = [root, ...root.querySelectorAll("*")];

  const loads = [];
  nodes.forEach((el) => {
    const cs = window.getComputedStyle(el);
    const key = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    if (seen.has(key)) return;
    seen.add(key);
    loads.push(
      document.fonts.load(key).catch(() => {
        // окремий шрифт міг не знайтись/не завантажитись — це не критично,
        // просто пропускаємо конкретну комбінацію
      })
    );
  });

  await Promise.all(loads);
  try {
    await document.fonts.ready;
  } catch {
    // ігноруємо — на деяких платформах document.fonts.ready ненадійний
  }
}

// Знімає елемент цілком (як html2canvas-скріншот) і компонує з нього
// багатосторінковий PDF, накладаючи поверх картинки невидимі клікабельні
// посилання на місці карток портфоліо. Це дає PDF, який виглядає точнісінько
// як сторінка попереднього перегляду — той самий шрифт, кольори, фон,
// аватар, відступи — бо це буквально знімок того самого DOM-вузла.
async function renderElementToPdf(element, fileNameBase) {
  const restore = swapForCapture(element);
  let canvas;
  let linkRects;
  let docWidthPx;

  try {
    await waitForImages(element);
    // Явно "прогріваємо" потрібні нарізки шрифту (regular/semibold/bold),
    // якими користується документ — це підстраховка на випадок, якщо якесь
    // накреслення ще не запитувалось у браузера.
    await warmUpFonts(element);
    // після swap даємо браузеру один кадр на перерахунок layout
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    docWidthPx = element.getBoundingClientRect().width;
    linkRects = collectLinkRects(element);

    canvas = await html2canvas(element, {
      scale: Math.min(3, (window.devicePixelRatio || 1) * 2),
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: element.scrollWidth,
      // html2canvas знімає не сам DOM, а клон у прихованому iframe — шрифти
      // там підвантажуються повторно й асинхронно. Якщо зняти канвас до
      // завершення цього довантаження, браузер малює "синтетичний bold"
      // (подвоєні/зсунуті контури літер) замість реального жирного
      // накреслення — саме це виглядало як "роздвоєний" текст на скріні.
      // onclone може повертати Promise — html2canvas його дочекається.
      onclone: async (clonedDoc) => {
        try {
          if (clonedDoc.fonts && clonedDoc.fonts.ready) {
            await clonedDoc.fonts.ready;
          }
        } catch {
          // якщо API шрифтів недоступне — просто знімаємо як є
        }
      },
    });
  } finally {
    restore();
  }

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Однаковий коефіцієнт переводить і "CSS-пікселі контейнера", і
  // "пікселі canvas" у pt сторінки — тому позиції посилань і сам знімок
  // завжди лишаються синхронізованими, незалежно від scale вище.
  const ratio = pageWidth / docWidthPx; // CSS px -> pt
  const totalHeightPt = (canvas.height / canvas.width) * pageWidth;
  const pageCount = Math.max(1, Math.ceil(totalHeightPt / pageHeight));

  const linkRectsPt = linkRects.map((r) => ({
    url: r.url,
    x: r.x * ratio,
    y: r.y * ratio,
    width: r.width * ratio,
    height: r.height * ratio,
  }));

  for (let page = 0; page < pageCount; page++) {
    const pageStartPt = page * pageHeight;
    const pageEndPt = Math.min(totalHeightPt, pageStartPt + pageHeight);
    const sliceHeightPt = pageEndPt - pageStartPt;

    // Відповідний шматок canvas (у пікселях canvas) для цієї сторінки.
    const sourceY = (pageStartPt / totalHeightPt) * canvas.height;
    const sourceHeight = (sliceHeightPt / totalHeightPt) * canvas.height;

    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = Math.max(1, Math.round(sourceHeight));
    const ctx = sliceCanvas.getContext("2d");
    ctx.drawImage(
      canvas,
      0,
      sourceY,
      canvas.width,
      sourceHeight,
      0,
      0,
      canvas.width,
      sliceCanvas.height
    );

    if (page > 0) doc.addPage();
    doc.setPage(page + 1);
    doc.addImage(
      sliceCanvas.toDataURL("image/jpeg", 0.95),
      "JPEG",
      0,
      0,
      pageWidth,
      sliceHeightPt
    );

    // Клікабельні оверлеї над картками портфоліо, що потрапляють на цю
    // сторінку (якщо картка розрізана переносом сторінки — розбиваємо
    // посилання на дві частини, по одній на кожну сторінку).
    linkRectsPt.forEach((r) => {
      const top = Math.max(r.y, pageStartPt);
      const bottom = Math.min(r.y + r.height, pageEndPt);
      if (bottom <= top) return;
      doc.link(r.x, top - pageStartPt, r.width, bottom - top, { url: r.url });
    });
  }

  return {
    blob: doc.output("blob"),
    fileName: `${sanitizeFileName(fileNameBase)}.pdf`,
  };
}

// Рендерить готовий HTML-рядок (з shareTemplate.js) у прихований iframe і
// знімає його html2canvas'ом через renderElementToPdf — так PDF виглядає
// точнісінько як відповідний HTML-файл (той самий шаблон, ті самі стилі),
// без дублювання розмітки в окремому DOM-дереві застосунку.
async function renderHtmlStringToPdf(html, fileNameBase) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:460px;height:1200px;border:0;visibility:hidden;";
  document.body.appendChild(iframe);

  try {
    await new Promise((resolve) => {
      iframe.addEventListener("load", resolve, { once: true });
      iframe.srcdoc = html;
    });
    const doc = iframe.contentDocument;
    await doc.fonts?.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    // Розтягуємо iframe під фактичну висоту вмісту, інакше html2canvas
    // обріже знімок по початкових 1200px.
    iframe.style.height = `${doc.body.scrollHeight}px`;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    return await renderElementToPdf(doc.body, fileNameBase);
  } finally {
    iframe.remove();
  }
}

export async function generateResumePdf(resume, { shareUrl, lang } = {}) {
  const { html, fileName } = buildResumeShareHtml(resume, { shareUrl, lang });
  return renderHtmlStringToPdf(html, fileName.replace(/\.html$/, ""));
}

export async function generateVacancyPdf(vacancy, { shareUrl, lang } = {}) {
  const { html, fileName } = buildVacancyShareHtml(vacancy, { shareUrl, lang });
  return renderHtmlStringToPdf(html, fileName.replace(/\.html$/, ""));
}
