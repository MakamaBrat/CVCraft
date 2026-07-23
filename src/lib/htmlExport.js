function sanitizeFileName(name) {
  return (name || "document")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

// Той самий трюк, що й раніше в pdf.js: чекаємо, поки всі <img> всередині
// елемента довантажаться, щоб в експорті не лишилось порожніх
// прямокутників (аватар, фон, favicon-и посилань тощо).
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
              setTimeout(resolve, 4000);
            })
    )
  );
}

// Спільний критерій: чи цей data-pdf-hide елемент — справді "живий" віджет
// (iframe/video/audio, який html2canvas/статичний HTML не осилює), чи це
// просто <img>, позначений так само лише заради старого PDF-обходу.
function isLiveWidgetEl(el) {
  return /^(IFRAME|VIDEO|AUDIO)$/.test(el.tagName) || Boolean(el.querySelector("iframe, video, audio"));
}

// Wizard.jsx позначає "живі" віджети (iframe/video/audio) атрибутом
// data-pdf-hide, а їхні статичні картки-заглушки — data-pdf-only
// (за замовчуванням приховані через інлайновий style={{display:"none"}}).
// На час експорту міняємо їх видимість місцями. ВАЖЛИВО: заглушку просто
// показуємо, знімаючи інлайновий display:none, а не форсимо display:block —
// інакше це перебиває Tailwind-клас "flex" на самій картці (напр. іконка
// App Store/Google Play) і ламає центрування вмісту всередині неї. Прості
// <img>, позначені data-pdf-hide лише заради старого PDF-обходу, взагалі не
// чіпаємо тут — вони й так нормально рендеряться в HTML.
function swapForCapture(root) {
  const hideEls = Array.from(root.querySelectorAll("[data-pdf-hide]")).filter(isLiveWidgetEl);
  const onlyEls = Array.from(root.querySelectorAll("[data-pdf-only]"));
  const prevHide = hideEls.map((el) => el.style.display);
  const prevOnly = onlyEls.map((el) => el.style.display);

  hideEls.forEach((el) => {
    el.style.display = "none";
  });
  onlyEls.forEach((el) => {
    el.style.removeProperty("display");
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

// Копіює КОЖНУ комп'ютовану CSS-властивість з живого вузла на клон,
// проходячи обидва дерева паралельно. Завдяки цьому експортований HTML
// виглядає піксель-в-піксель як зараз на екрані — жодної залежності від
// Tailwind чи інших стилів білда в самому файлі не лишається.
function inlineComputedStyles(src, clone) {
  const cs = window.getComputedStyle(src);
  let styleText = "";
  for (let i = 0; i < cs.length; i++) {
    const prop = cs[i];
    styleText += `${prop}:${cs.getPropertyValue(prop)};`;
  }
  clone.setAttribute("style", styleText);
  clone.removeAttribute("class");

  const srcChildren = src.children;
  const cloneChildren = clone.children;
  for (let i = 0; i < srcChildren.length; i++) {
    if (cloneChildren[i]) inlineComputedStyles(srcChildren[i], cloneChildren[i]);
  }
}

// Для звичайних (не YouTube/Vimeo) відео-файлів у Wizard.jsx немає готової
// обкладинки (thumbUrl === null) — картка-заглушка показує лише чорний
// прямокутник з кнопкою Play. У нас тут є доступ до вже завантаженого живого
// <video>, тож перед видаленням витягуємо з нього поточний кадр як картинку
// і вставляємо в заглушку — так відео в експорті теж має обкладинку.
function captureVideoFrame(video) {
  try {
    if (!video || !video.videoWidth || !video.videoHeight) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return null; // "заражене" (CORS) canvas чи інша помилка — просто пропускаємо
  }
}

function attachVideoThumbnails(root) {
  const hideEls = Array.from(root.querySelectorAll("[data-pdf-hide]"));
  hideEls.forEach((hideEl) => {
    const video = hideEl.querySelector("video");
    if (!video) return;
    const fallback = hideEl.nextElementSibling;
    if (!fallback || !fallback.hasAttribute("data-pdf-only") || fallback.querySelector("img")) return;
    const dataUrl = captureVideoFrame(video);
    if (!dataUrl) return;
    const frameBox = fallback.querySelector(".relative") || fallback.firstElementChild;
    if (!frameBox) return;
    const img = document.createElement("img");
    img.src = dataUrl;
    img.alt = "";
    img.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;";
    frameBox.style.position = frameBox.style.position || "relative";
    frameBox.insertBefore(img, frameBox.firstChild);
  });
}

// Качаємо картинку і перетворюємо на data: URL, щоб готовий файл не залежав
// від того, чи буде доступний зовнішній хостинг (аватар, фонове GIF,
// прев'ю сайтів тощо) у момент, коли хтось відкриє цей HTML. Якщо хост не
// дозволяє cross-origin fetch — тихо лишаємо оригінальний URL як був,
// щоб нічого не зламати.
async function toDataUrl(url) {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function embedExternalImages(root) {
  const imgs = Array.from(root.querySelectorAll('img[src^="http"]'));
  const styledNodes = Array.from(root.querySelectorAll('[style*="url("]'));

  await Promise.all([
    ...imgs.map(async (img) => {
      const dataUrl = await toDataUrl(img.getAttribute("src"));
      if (dataUrl) img.setAttribute("src", dataUrl);
    }),
    ...styledNodes.map(async (node) => {
      const style = node.getAttribute("style") || "";
      const matches = [...style.matchAll(/url\((['"]?)(https?:[^'")]+)\1\)/g)];
      if (!matches.length) return;
      let newStyle = style;
      for (const [full, , url] of matches) {
        const dataUrl = await toDataUrl(url);
        if (dataUrl) newStyle = newStyle.replace(full, `url("${dataUrl}")`);
      }
      node.setAttribute("style", newStyle);
    }),
  ]);
}

// MediaPreview у Wizard.jsx обгортає кожну картку портфоліо в
// data-pdf-link="<url>". Замість накладання невидимого посилання (як
// робив pdf.js для картинки-знімка) тут перетворюємо саму обгортку на
// справжній клікабельний <a href>. Якщо картка вже сама по собі є <a>
// (кнопки соцмереж / App Store, Google Play) — лишаємо як є, щоб не
// вкладати посилання одне в одне.
function makePortfolioClickable(clone) {
  const linkNodes = Array.from(clone.querySelectorAll("[data-pdf-link]"));
  linkNodes.forEach((node) => {
    const url = node.getAttribute("data-pdf-link");
    if (!url || node.querySelector("a")) return;

    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener noreferrer");
    a.setAttribute(
      "style",
      (node.getAttribute("style") || "") + "display:block;text-decoration:none;color:inherit;cursor:pointer;"
    );
    while (node.firstChild) a.appendChild(node.firstChild);
    node.replaceWith(a);
  });
}

// data-pdf-hide зазвичай позначає iframe/video/audio — їх справді треба
// прибрати й лишити тільки статичну заглушку-посилання поруч. Але подекуди
// (напр. іконка застосунку в AppStoreCard) той самий атрибут стоїть просто
// на <img>, який у звичайному HTML рендериться без проблем — такий краще
// лишити живим (це справжня іконка), а сусідню SVG-заглушку прибрати.
function resolveHiddenWidgets(clone) {
  const hideEls = Array.from(clone.querySelectorAll("[data-pdf-hide]"));
  hideEls.forEach((el) => {
    if (isLiveWidgetEl(el)) {
      el.remove();
      return;
    }
    el.removeAttribute("data-pdf-hide");
    const fallback = el.nextElementSibling;
    if (fallback && fallback.hasAttribute("data-pdf-only")) fallback.remove();
  });
  clone.querySelectorAll("[data-pdf-only]").forEach((el) => el.removeAttribute("data-pdf-only"));
}

async function renderElementToHtml(element, fileNameBase, docTitle) {
  const restore = swapForCapture(element);
  let clone;
  try {
    await waitForImages(element);
    // до того, як заглушки приховають/приберуть <video> — витягуємо з них
    // поточний кадр як обкладинку (поки елемент ще живий і в DOM)
    attachVideoThumbnails(element);
    // після swap даємо браузеру кадр на перерахунок layout, і чекаємо, щоб
    // веб-шрифт (Manrope) точно встиг застосуватись — інакше ширина тексту
    // під час зняття стилів рахується по інших метриках, ніж у фінальному
    // файлі, і поля на кшталт імені можуть обрізатись в "…"
    await document.fonts?.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    clone = element.cloneNode(true);
    inlineComputedStyles(element, clone);
    makePortfolioClickable(clone);
  } finally {
    restore();
  }

  // "Живі" iframe/video/audio прибираємо (замінені на посилання-картки вище),
  // а прості <img>, які лиш технічно позначені для PDF-обходу, лишаємо живими.
  resolveHiddenWidgets(clone);
  // Технічні підписи, потрібні тільки у "живому" застосунку (напр. дублюючий
  // напис "Завантажити в Google Play/App Store" під іконкою) — в статичному
  // файлі виглядають зайвими, Wizard.jsx позначає їх data-pdf-export-hide.
  clone.querySelectorAll("[data-pdf-export-hide]").forEach((el) => el.remove());
  // Деякі елементи в живому застосунку дублюють підпис (напр. назва
  // застосунку над кнопкою "Завантажити в Google Play") — у статичному
  // файлі показуємо замість цього короткий однаковий підпис.
  clone.querySelectorAll("[data-pdf-export-text]").forEach((el) => {
    el.textContent = el.getAttribute("data-pdf-export-text");
    el.removeAttribute("data-pdf-export-text");
  });
  clone.removeAttribute("id");

  // Робимо картинки (аватар, фон, GIF-и портфоліо, прев'ю сайтів) незалежними
  // від зовнішнього хостингу — вбудовуємо їх як base64 просто у файл.
  await embedExternalImages(clone);

  const bodyBg = window.getComputedStyle(document.body).backgroundColor || "#0a0a0a";

  const html = `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(docTitle)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
<style>
  html, body { margin: 0; padding: 0; background: ${bodyBg}; }
  body { display: flex; justify-content: center; padding: 24px 12px; box-sizing: border-box; font-family: Manrope, sans-serif; }
  a { cursor: pointer; }
  a:hover { opacity: 0.92; }
</style>
</head>
<body>
${clone.outerHTML}
</body>
</html>`;

  return {
    blob: new Blob([html], { type: "text/html;charset=utf-8" }),
    fileName: `${sanitizeFileName(fileNameBase)}.html`,
  };
}

export async function generateResumeHtml(resume) {
  const element = document.getElementById("resume-doc");
  if (!element) {
    throw new Error("Не знайдено елемент резюме для експорту (#resume-doc)");
  }
  const title = `${resume?.fullName || "Резюме"}${resume?.role ? " — " + resume.role : ""}`;
  return renderElementToHtml(element, resume?.fullName || "Resume", title);
}

// Той самий підхід, що й для резюме (renderElementToHtml): знімаємо DOM
// #vacancy-doc, інлайнимо всі computed-стилі й картинки, отримуємо
// самодостатній HTML-файл, який виглядає так само, як картка вакансії в
// застосунку.
export async function generateVacancyHtml(vacancy) {
  const element = document.getElementById("vacancy-doc");
  if (!element) {
    throw new Error("Не знайдено елемент вакансії для експорту (#vacancy-doc)");
  }
  const title = [vacancy?.position, vacancy?.company].filter(Boolean).join(" — ") || "Вакансія";
  return renderElementToHtml(element, [vacancy?.position, vacancy?.company].filter(Boolean).join(" ") || "Vacancy", title);
}
