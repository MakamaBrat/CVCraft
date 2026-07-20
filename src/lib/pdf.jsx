import { pdf } from "@react-pdf/renderer";
import ResumePdf from "../pdf/ResumePdf.jsx";

function sanitizeFileName(name) {
  return (name || "document")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

export async function generateResumePdf(resume) {
  const blob = await pdf(
    <ResumePdf resume={resume} />
  ).toBlob();

  return {
    blob,
    fileName: `${sanitizeFileName(resume?.fullName || "Resume")}.pdf`,
  };
}

// пока оставляем старую вакансию
export async function generateVacancyPdf() {
  throw new Error("Vacancy PDF is not migrated yet.");
}