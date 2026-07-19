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
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);

  const node = document.getElementById(elementId);
  if (!node) throw new Error(`pdf_source_not_found:${elementId}`);

  // Відео/гіфки не повинні потрапляти у PDF — так само, як раніше з
  // window.print() + класом print:hidden. html2canvas не бачить @media
  // print, тому ховаємо явно на час рендеру канваса.
  const hideEls = Array.from(node.querySelectorAll('[data-pdf-hide="true"]'));
  const prevDisplay = hideEls.map((el) => el.style.display);
  hideEls.forEach((el) => {
    el.style.display = "none";
  });

  try {
    const canvas = await html2canvas(node, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const blob = pdf.output("blob");
    const fileName = `${sanitizeFileName(fileNameBase) || "document"}.pdf`;
    return { blob, fileName };
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
