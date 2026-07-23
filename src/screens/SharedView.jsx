import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api.js";
import { MediaPreview } from "./Wizard.jsx";
import Avatar from "../components/Avatar.jsx";
import ReportModal from "../components/ReportModal.jsx";
import { getColorTheme, getAlign, getDocBackgroundStyle } from "../lib/docTheme.js";
import { getTelegramWebApp } from "../lib/telegram.js";
import { useLanguage } from "../lib/i18n/index.jsx";

const ACCENTS = {
  minimal: "#4b5563",
  modern: "#6c5ce7",
  bold: "#ff7a59",
  classic: "#2f6fb0",
};

const MESSAGE_LABEL = { uk: "Написати", ru: "Написать", en: "Message" };

function TelegramIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M21.5 3.5L2.7 11.1c-1.2.5-1.2 1.2-.2 1.5l4.8 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.2-2.1 4.6 3.4c.8.5 1.4.2 1.6-.8l3-14c.3-1.2-.5-1.7-1.3-1.4z"
        fill="currentColor"
      />
    </svg>
  );
}

function openTelegramUser(username) {
  const tg = getTelegramWebApp();
  const url = `https://t.me/${username}`;
  if (tg?.openTelegramLink) tg.openTelegramLink(url);
  else if (tg?.openLink) tg.openLink(url);
  else window.open(url, "_blank");
}

export default function SharedView({ resumeId, onOpenApp, onBrowseVacancies, onCreateVacancy }) {
  const { lang, t } = useLanguage();
  const [resume, setResume] = useState(null);
  // Юзернейм власника резюме — окреме поле у відповіді /api/resume-share
  // (НЕ частина resume.data), бекенд має підтягувати його з таблиці
  // користувачів по owner_telegram_id власника резюме.
  const [ownerUsername, setOwnerUsername] = useState(null);
  const [status, setStatus] = useState("loading");
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await apiFetch(`/api/resume-share?id=${encodeURIComponent(resumeId)}`);
        if (cancelled) return;
        setResume(res.data);
        setOwnerUsername(res.telegramUsername || null);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("not-found");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [resumeId]);

  if (status === "loading") {
    return (
      <div className="flex-1 flex flex-col bg-base-950">
        <div className="flex-1 flex items-center justify-center text-white/40 text-sm">{t("share.loadingResume")}</div>
      </div>
    );
  }

  if (status === "not-found") {
    return (
      <div className="flex-1 flex flex-col bg-base-950">
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-3">
          <p className="text-sm text-white/60">{t("share.resumeNotFound")}</p>
          <button onClick={onOpenApp} className="tap text-sm text-accent-300 font-medium">
            {t("share.openApp")}
          </button>
        </div>
      </div>
    );
  }

  const accent = ACCENTS[resume.template] || ACCENTS.minimal;
  const theme = getColorTheme(resume.colorScheme);
  const align = getAlign(resume.align);
  const isCenter = align === "center";

  return (
    <div className="flex-1 flex flex-col bg-base-950">

      <div className="px-6 pt-2 pb-4 flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-accent-500 flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M2 3h10v2H2zM2 6h10v2H2zM2 9h7v2H2z" fill="black" />
          </svg>
        </div>
        <span className="font-semibold text-sm text-white/70">CV DECK</span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-8 fade-up">
        <div
          className="rounded-xl shadow-xl mx-auto"
          style={{
            maxWidth: 400,
            padding: "28px 24px",
            fontFamily: "Manrope, sans-serif",
            ...getDocBackgroundStyle(theme, resume.backgroundUrl),
            color: theme.text,
            textAlign: align,
          }}
        >
          <div
            className={`flex gap-3 pb-4 mb-4 ${isCenter ? "flex-col items-center text-center" : "items-center"}`}
            style={{ borderBottom: `2px solid ${accent}` }}
          >
            <Avatar url={resume.avatarUrl} name={resume.fullName} accent={accent} theme={theme} />
            <div className="min-w-0">
              <h2 className="text-lg font-bold leading-tight truncate">{resume.fullName || t("resume.namePlaceholder")}</h2>
              <p className="text-sm font-medium truncate" style={{ color: accent }}>
                {resume.role || t("resume.rolePlaceholder")}
              </p>
            </div>
          </div>

          <div
            className={`flex flex-wrap gap-x-4 gap-y-1 text-[11px] mb-4 ${isCenter ? "justify-center" : ""}`}
            style={{ color: theme.textMed }}
          >
            {resume.email && <span>{resume.email}</span>}
            {resume.phone && <span>{resume.phone}</span>}
            {resume.city && <span>{resume.city}</span>}
          </div>

          {resume.summary && (
            <section className="mb-4">
              <h3 className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: accent }}>
                {t("resume.sections.about")}
              </h3>
              <p className="text-[12px] leading-relaxed" style={{ color: theme.text, opacity: 0.85 }}>
                {resume.summary}
              </p>
            </section>
          )}

          {resume.experience?.length > 0 && (
            <section className="mb-4">
              <h3 className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: accent }}>
                {t("resume.sections.experience")}
              </h3>
              <div className="space-y-3">
                {resume.experience.map((e) => (
                  <div key={e.id}>
                    <div className={`flex items-baseline gap-2 ${isCenter ? "flex-col" : "justify-between"}`}>
                      <p className="text-[12.5px] font-semibold">{e.position}</p>
                      <p className="text-[10px] shrink-0" style={{ color: theme.textFaint }}>
                        {e.period}
                      </p>
                    </div>
                    <p className="text-[11px] mb-1" style={{ color: theme.textMed }}>
                      {e.company}
                    </p>
                    {e.description && (
                      <p className="text-[11.5px] leading-relaxed" style={{ color: theme.text, opacity: 0.78 }}>
                        {e.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {resume.education?.length > 0 && (
            <section className="mb-4">
              <h3 className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: accent }}>
                {t("resume.sections.education")}
              </h3>
              <div className="space-y-2">
                {resume.education.map((e) => (
                  <div key={e.id}>
                    <div className={`flex items-baseline gap-2 ${isCenter ? "flex-col" : "justify-between"}`}>
                      <p className="text-[12.5px] font-semibold">{e.school}</p>
                      <p className="text-[10px] shrink-0" style={{ color: theme.textFaint }}>
                        {e.period}
                      </p>
                    </div>
                    {e.degree && (
                      <p className="text-[11px]" style={{ color: theme.textMed }}>
                        {e.degree}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {resume.skills?.length > 0 && (
            <section className="mb-4">
              <h3 className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: accent }}>
                {t("resume.sections.skills")}
              </h3>
              <div className={`flex flex-wrap gap-1.5 ${isCenter ? "justify-center" : ""}`}>
                {resume.skills.map((s) => (
                  <span
                    key={s}
                    className="text-[10.5px] font-medium rounded-full px-2.5 py-1"
                    style={{ background: `${accent}${theme.chipAlpha}`, color: accent }}
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
                {t("resume.sections.portfolio")}
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

        {ownerUsername && (
          <button
            onClick={() => openTelegramUser(ownerUsername)}
            className="tap mt-5 w-full max-w-[400px] mx-auto flex items-center justify-center gap-2 bg-[#2AABEE] text-white font-semibold text-sm rounded-xl py-3.5"
          >
            <TelegramIcon />
            {MESSAGE_LABEL[lang]}
          </button>
        )}

        <button
          onClick={onOpenApp}
          className={`tap w-full max-w-[400px] mx-auto flex items-center justify-center gap-2 bg-accent-500 text-base-950 font-semibold text-sm rounded-xl py-3.5 ${
            ownerUsername ? "mt-2.5" : "mt-5"
          }`}
        >
          {t("share.createOwnResume")}
        </button>

        <div className="mt-2.5 w-full max-w-[400px] mx-auto grid grid-cols-2 gap-2.5">
          <button
            onClick={onBrowseVacancies}
            className="tap flex items-center justify-center gap-2 bg-base-900 border border-base-700 text-white/80 font-semibold text-sm rounded-xl py-3"
          >
            {t("share.browseVacancies")}
          </button>
          <button
            onClick={onCreateVacancy}
            className="tap flex items-center justify-center gap-2 bg-base-900 border border-base-700 text-white/80 font-semibold text-sm rounded-xl py-3"
          >
            {t("share.createVacancy")}
          </button>
        </div>

        <button
          onClick={() => setReportOpen(true)}
          className="tap mt-3 w-full max-w-[400px] mx-auto flex items-center justify-center text-xs text-white/35 py-1"
        >
          {t("report.reportResume")}
        </button>
      </div>

      {reportOpen && (
        <ReportModal targetType="resume" resumeId={resumeId} onClose={() => setReportOpen(false)} />
      )}
    </div>
  );
}
