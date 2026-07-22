import { useState } from "react";
import { MediaPreview } from "./Wizard.jsx";
import Avatar from "../components/Avatar.jsx";
import ReportModal from "../components/ReportModal.jsx";
import { useLanguage } from "../lib/i18n/index.jsx";
import { timeAgo } from "../lib/timeAgo.js";
import { getColorTheme, getAlign, getDocBackgroundStyle } from "../lib/docTheme.js";

const ACCENTS = { minimal: "#4b5563", modern: "#6c5ce7", bold: "#ff7a59", classic: "#2f6fb0" };

export default function VacancyDetail({ vacancy, applied, resumes = [], onBack, onApply }) {
  const { t } = useLanguage();
  const [message, setMessage] = useState("");
  const [resumeId, setResumeId] = useState(resumes[0]?.id || "");
  const [sent, setSent] = useState(false);
  const [reporting, setReporting] = useState(false);
  const accent = ACCENTS[vacancy.template] || ACCENTS.minimal;
  const theme = getColorTheme(vacancy.colorScheme);
  const align = getAlign(vacancy.align);
  const isCenter = align === "center";

  const requiresResume = Boolean(vacancy.requireResume);
  const canSubmit = !requiresResume || Boolean(resumeId);

  const submit = async () => {
    if (!canSubmit) return;
    const ok = await onApply(message, resumeId || null);
    if (ok) setSent(true);
  };

  return (
    <div className="flex-1 flex flex-col bg-base-950">
      <div className="px-6 pt-2 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="tap w-8 h-8 flex items-center justify-center text-white/70">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 3L5 9l6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-bold flex-1">{t("vacancy.title")}</h1>
        <button
          onClick={() => setReporting(true)}
          className="tap shrink-0 text-xs font-medium text-white/45 border border-base-700 rounded-full px-3 py-1.5"
        >
          {t("report.reportVacancy")}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-4">
        <div
          className="rounded-xl shadow-xl mx-auto mb-4"
          style={{
            width: "100%",
            maxWidth: 400,
            padding: "28px 24px",
            fontFamily: "Manrope, sans-serif",
            ...getDocBackgroundStyle(theme, vacancy.backgroundUrl),
            color: theme.text,
            textAlign: align,
          }}
        >
          <div className={`flex gap-3 pb-4 mb-4 ${isCenter ? "flex-col items-center text-center" : "items-center"}`} style={{ borderBottom: `2px solid ${accent}` }}>
            <Avatar url={vacancy.avatarUrl} name={vacancy.company || vacancy.position} accent={accent} theme={theme} />
            <div className="min-w-0">
              <h2 className="text-lg font-bold leading-tight mb-1 truncate">{vacancy.position}</h2>
              <p className="text-sm font-medium truncate" style={{ color: accent }}>{vacancy.company}</p>
            </div>
          </div>
          <div
            className={`flex flex-wrap gap-x-4 gap-y-1 text-[11px] mb-4 ${isCenter ? "justify-center" : ""}`}
            style={{ color: theme.textMed }}
          >
            {vacancy.salary && <span>{vacancy.salary}</span>}
            {vacancy.city && <span>{vacancy.city}</span>}
            {vacancy.employmentType && <span>{vacancy.employmentType}</span>}
            {vacancy.createdAt && <span>{timeAgo(vacancy.createdAt, t)}</span>}
          </div>
          {(vacancy.tags || []).length > 0 && (
            <div className={`flex flex-wrap gap-1.5 mb-4 ${isCenter ? "justify-center" : ""}`}>
              {vacancy.tags.map((tg) => (
                <span
                  key={tg}
                  className="text-[10px] font-medium rounded-full px-2.5 py-1"
                  style={{ background: `${accent}${theme.chipAlpha}`, color: accent }}
                >
                  {tg}
                </span>
              ))}
            </div>
          )}
          {vacancy.description && (
            <section className="mb-4">
              <h3 className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: accent }}>
                {t("vacancy.description")}
              </h3>
              <p className="text-[12px] leading-relaxed whitespace-pre-line" style={{ color: theme.text, opacity: 0.85 }}>
                {vacancy.description}
              </p>
            </section>
          )}
          {vacancy.requirements && (
            <section className="mb-4">
              <h3 className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: accent }}>
                {t("vacancy.requirements")}
              </h3>
              <p className="text-[12px] leading-relaxed whitespace-pre-line" style={{ color: theme.text, opacity: 0.85 }}>
                {vacancy.requirements}
              </p>
            </section>
          )}
          {(vacancy.media || []).length > 0 && (
            <section>
              <div className="space-y-3">
                {vacancy.media.map((p) => (
                  <MediaPreview key={p.id} item={p} />
                ))}
              </div>
            </section>
          )}
        </div>

        {!applied && !sent ? (
          <div className="bg-base-850 border border-base-700 rounded-xl p-4">
            {resumes.length > 0 ? (
              <>
                <label className="block text-sm font-medium text-white/85 mb-1.5">{t("vacancy.chooseResume")}</label>
                <div className="flex flex-col gap-2 mb-3">
                  {resumes.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setResumeId(r.id)}
                      className={`tap text-left rounded-xl px-4 py-3 border ${
                        resumeId === r.id ? "border-accent-500 bg-accent-500/10" : "border-base-700 bg-base-900"
                      }`}
                    >
                      <p className="text-sm font-medium truncate">{r.fullName || "—"}</p>
                      <p className="text-xs text-white/45 truncate">{r.role}</p>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-amber-400/80 mb-3">{t("vacancy.createResumeFirst")}</p>
            )}
            {requiresResume && (
              <p className="text-xs text-amber-400/80 mb-3">{t("vacancy.resumeRequiredNotice")}</p>
            )}
            <label className="block text-sm font-medium text-white/85 mb-1.5">{t("vacancy.applyMessage")}</label>
            <textarea
              className="w-full bg-base-900 border border-base-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-accent-500 min-h-[90px] resize-none mb-3"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="tap w-full bg-accent-500 disabled:bg-base-700 disabled:text-white/30 text-base-950 font-semibold text-sm rounded-xl py-3"
            >
              {resumes.length > 0 ? t("vacancy.applyWithResume") : t("vacancy.apply")}
            </button>
          </div>
        ) : (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-medium rounded-xl p-4 text-center">
            {t("vacancy.applySent")}
          </div>
        )}
      </div>

      {reporting && (
        <ReportModal targetType="vacancy" vacancyId={vacancy.id} onClose={() => setReporting(false)} />
      )}
    </div>
  );
}
