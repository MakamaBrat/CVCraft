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

export async function generatePdfFromElement(elementId, fileNameBase) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const node = document.getElementById(elementId);
  if (!node) throw new Error(`pdf_source_not_found:${elementId}`);

  const hideEls = Array.from(node.querySelectorAll('[data-pdf-hide="true"]'));
  const prevDisplay = hideEls.map((el) => el.style.display);
  hideEls.forEach((el) => {
    el.style.display = "none";
  });

  try {
    // Ждем загрузку шрифтов и завершение рендера
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const canvas = await html2canvas(node, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: -window.scrollY,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    const margin = 20;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const imgData = canvas.toDataURL("image/png");

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;

    while (heightLeft > 0) {
      position = margin - (imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;
    }

    return {
      blob: pdf.output("blob"),
      fileName: `${sanitizeFileName(fileNameBase) || "document"}.pdf`,
    };
  } finally {
    hideEls.forEach((el, i) => {
      el.style.display = prevDisplay[i];
    });
  }
}

export async function generatePdfFromElement(elementId, fileNameBase) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const node = document.getElementById(elementId);
  if (!node) throw new Error(`pdf_source_not_found:${elementId}`);

  const hideEls = Array.from(node.querySelectorAll('[data-pdf-hide="true"]'));
  const prevDisplay = hideEls.map((el) => el.style.display);
  hideEls.forEach((el) => {
    el.style.display = "none";
  });

  try {
    // Ждем загрузку шрифтов и завершение рендера
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const canvas = await html2canvas(node, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: -window.scrollY,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    const margin = 20;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const imgData = canvas.toDataURL("image/png");

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;

    while (heightLeft > 0) {
      position = margin - (imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;
    }

    return {
      blob: pdf.output("blob"),
      fileName: `${sanitizeFileName(fileNameBase) || "document"}.pdf`,
    };
  } finally {
    hideEls.forEach((el, i) => {
      el.style.display = prevDisplay[i];
    });
  }
}
export async function generateResumePdf(resume) {
  return generatePdfFromElement("resume-doc", resume?.fullName);
}

export async function generateVacancyPdf(vacancy) {
  return generatePdfFromElement("vacancy-doc", `${vacancy?.position || ""} ${vacancy?.company || ""}`);
}
