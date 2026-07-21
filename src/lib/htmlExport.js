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

// Wizard.jsx позначає "живі" віджети (iframe/video/audio) атрибутом
// data-pdf-hide, а їхні статичні картки-заглушки — data-pdf-only
// (за замовчуванням приховані). На час експорту міняємо їх видимість
// місцями, щоб зняти комп'ютовані стилі саме зі стану "заглушка видима",
// після експорту повертаємо як було.
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

async function renderElementToHtml(element, fileNameBase, docTitle) {
  const restore = swapForCapture(element);
  let clone;
  try {
    await waitForImages(element);
    // після swap даємо браузеру кадр на перерахунок layout
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    clone = element.cloneNode(true);
    inlineComputedStyles(element, clone);
    makePortfolioClickable(clone);
  } finally {
    restore();
  }

  // Прибираємо технічні атрибути, що більше не потрібні в самостійному файлі:
  // "живі" iframe/video/audio видаляємо повністю (замінені на посилання-картки вище),
  // заглушки лишаємо видимими назавжди.
  clone.querySelectorAll("[data-pdf-hide]").forEach((el) => el.remove());
  clone.querySelectorAll("[data-pdf-only]").forEach((el) => {
    el.removeAttribute("data-pdf-only");
    el.style.display = "block";
  });
  clone.removeAttribute("id");

  const bodyBg = window.getComputedStyle(document.body).backgroundColor || "#0a0a0a";

  const html = `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(docTitle)}</title>
<style>
  html, body { margin: 0; padding: 0; background: ${bodyBg}; }
  body { display: flex; justify-content: center; padding: 24px 12px; box-sizing: border-box; }
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

// поки лишаємо стару заглушку — вакансії ще не мігровані
export async function generateVacancyPdf() {
  throw new Error("Vacancy export is not migrated yet.");
}
