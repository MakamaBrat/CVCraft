import StatusBar from "../components/StatusBar.jsx";
import { MediaPreview } from "./Wizard.jsx";

const ACCENTS = {
  minimal: "#4b5563",
  modern: "#6c5ce7",
  bold: "#ff7a59",
  classic: "#2f6fb0",
};

function ResumeDocument({ resume }) {
  const accent = ACCENTS[resume.template] || ACCENTS.minimal;
  return (
    <div
      id="resume-doc"
      className="bg-white text-[#1c1c1c] rounded-xl shadow-xl mx-auto"
      style={{ width: "100%", maxWidth: 400, padding: "28px 24px", fontFamily: "Manrope, sans-serif" }}
    >
      <div className="flex items-center gap-3 pb-4 mb-4" style={{ borderBottom: `2px solid ${accent}` }}>
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
          style={{ background: accent }}
        >
          {(resume.fullName || "?")
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase())
            .join("")}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-tight truncate">{resume.fullName || "Ваше ім'я"}</h2>
          <p className="text-sm font-medium truncate" style={{ color: accent }}>
            {resume.role || "Посада"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-black/60 mb-4">
        {resume.email && <span>{resume.email}</span>}
        {resume.phone && <span>{resume.phone}</span>}
        {resume.city && <span>{resume.city}</span>}
      </div>

      {resume.summary && (
        <section className="mb-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: accent }}>
            Про мене
          </h3>
          <p className="text-[12px] leading-relaxed text-black/80">{resume.summary}</p>
        </section>
      )}

      {resume.experience.length > 0 && (
        <section className="mb-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: accent }}>
            Досвід роботи
          </h3>
          <div className="space-y-3">
            {resume.experience.map((e) => (
              <div key={e.id}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[12.5px] font-semibold">{e.position}</p>
                  <p className="text-[10px] text-black/45 shrink-0">{e.period}</p>
                </div>
                <p className="text-[11px] text-black/55 mb-1">{e.company}</p>
                {e.description && <p className="text-[11.5px] text-black/75 leading-relaxed">{e.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {resume.education.length > 0 && (
        <section className="mb-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: accent }}>
            Освіта
          </h3>
          <div className="space-y-2">
            {resume.education.map((e) => (
              <div key={e.id}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[12.5px] font-semibold">{e.school}</p>
                  <p className="text-[10px] text-black/45 shrink-0">{e.period}</p>
                </div>
                {e.degree && <p className="text-[11px] text-black/55">{e.degree}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {resume.skills.length > 0 && (
        <section className="mb-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: accent }}>
            Навички
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {resume.skills.map((s) => (
              <span
                key={s}
                className="text-[10.5px] font-medium rounded-full px-2.5 py-1"
                style={{ background: `${accent}1a`, color: accent }}
              >
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {(resume.portfolio || []).length > 0 && (
        <section className="print:hidden">
          <h3 className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: accent }}>
            Портфоліо
          </h3>
          <div className="space-y-3">
            {resume.portfolio.map((p) => (
              <div key={p.id}>
                {p.title && <p className="text-[11.5px] font-semibold mb-1">{p.title}</p>}
                <MediaPreview item={p} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function Preview({ resume, onBack, onDone }) {
  const handlePrint = () => window.print();

  return (
    <div className="flex-1 flex flex-col bg-base-950">
      <div className="print:hidden">
        <StatusBar />
        <div className="px-6 pt-2 pb-4 flex items-center gap-3">
          <button onClick={onBack} className="tap w-8 h-8 flex items-center justify-center text-white/70">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 3L5 9l6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-lg font-bold">Попередній перегляд</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-4">
        <ResumeDocument resume={resume} />
      </div>

      {(resume.portfolio || []).length > 0 && (
        <p className="px-6 pb-2 text-[11px] text-white/35 print:hidden">
          Відео та гіфки з портфоліо відтворюються на сторінці, але не включаються у PDF.
        </p>
      )}

      <div className="px-6 pb-6 pt-2 flex gap-3 print:hidden">
        <button
          onClick={handlePrint}
          className="tap flex-1 flex items-center justify-center gap-2 bg-base-800 border border-base-700 text-white font-semibold text-sm rounded-xl py-3.5"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 2h8v3H4zM3 6h10a1 1 0 011 1v4a1 1 0 01-1 1h-1v2H4v-2H3a1 1 0 01-1-1V7a1 1 0 011-1z"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
          </svg>
          Завантажити PDF
        </button>
        <button
          onClick={onDone}
          className="tap flex-1 flex items-center justify-center gap-2 bg-violet-500 text-white font-semibold text-sm rounded-xl py-3.5"
        >
          Зберегти
        </button>
      </div>
    </div>
  );
}
