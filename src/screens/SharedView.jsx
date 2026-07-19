import { useEffect, useState } from "react";
import { supabase, supabaseEnabled } from "../lib/supabase.js";
import StatusBar from "../components/StatusBar.jsx";
import { MediaPreview } from "./Wizard.jsx";

const ACCENTS = {
  minimal: "#4b5563",
  modern: "#6c5ce7",
  bold: "#ff7a59",
  classic: "#2f6fb0",
};

export default function SharedView({ resumeId, onOpenApp }) {
  const [resume, setResume] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabaseEnabled) {
        setStatus("no-backend");
        return;
      }
      const { data, error } = await supabase
        .from("resumes")
        .select("data")
        .eq("id", resumeId)
        .single();
      if (cancelled) return;
      if (error || !data) {
        setStatus("not-found");
        return;
      }
      setResume(data.data);
      setStatus("ready");
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [resumeId]);

  if (status === "loading") {
    return (
      <div className="flex-1 flex flex-col bg-base-950">
        <StatusBar />
        <div className="flex-1 flex items-center justify-center text-white/40 text-sm">Завантаження резюме…</div>
      </div>
    );
  }

  if (status === "no-backend" || status === "not-found") {
    return (
      <div className="flex-1 flex flex-col bg-base-950">
        <StatusBar />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-3">
          <p className="text-sm text-white/60">
            {status === "not-found" ? "Резюме не знайдено або посилання застаріло." : "Базу даних не підключено."}
          </p>
          <button onClick={onOpenApp} className="tap text-sm text-violet-300 font-medium">
            Перейти до CVCraft
          </button>
        </div>
      </div>
    );
  }

  const accent = ACCENTS[resume.template] || ACCENTS.minimal;

  return (
    <div className="flex-1 flex flex-col bg-base-950">
      <StatusBar />

      <div className="px-6 pt-2 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-violet-500 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M2 3h10v2H2zM2 6h10v2H2zM2 9h7v2H2z" fill="white" />
            </svg>
          </div>
          <span className="font-semibold text-sm text-white/70">CVCraft</span>
        </div>
        <button onClick={onOpenApp} className="tap text-xs text-violet-300 font-medium">
          Створити своє
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-8 fade-up">
        <div
          className="bg-white text-[#1c1c1c] rounded-xl shadow-xl mx-auto"
          style={{ maxWidth: 400, padding: "28px 24px", fontFamily: "Manrope, sans-serif" }}
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

          {resume.experience?.length > 0 && (
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

          {resume.education?.length > 0 && (
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

          {resume.skills?.length > 0 && (
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

          {resume.portfolio?.length > 0 && (
            <section>
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
      </div>
    </div>
  );
}
