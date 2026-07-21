import { useState } from "react";
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

function MessageButton({ username, label, disabledLabel }) {
  if (!username) {
    return (
      <p className="text-[11px] text-white/35 mt-2" title={disabledLabel}>
        {disabledLabel}
      </p>
    );
  }
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        openTelegramUser(username);
      }}
      className="tap mt-2 flex items-center justify-center gap-1.5 bg-[#2AABEE] text-white text-xs font-semibold rounded-lg px-3 py-2"
    >
      <TelegramIcon />
      {label}
    </button>
  );
}

function ApplicantDetail({ applicant, onClose, t }) {
  const r = applicant.resume_snapshot;
  const accent = ACCENTS[r?.template] || ACCENTS.minimal;
  const theme = getColorTheme(r?.colorScheme);
  const align = getAlign(r?.align);
  const isCenter = align === "center";
  const [reporting, setReporting] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-base-950 flex flex-col">
      <div className="px-6 pt-2 pb-4 flex items-center gap-3">
        <button onClick={onClose} className="tap w-8 h-8 flex items-center justify-center text-white/70">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 3L5 9l6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-bold flex-1 truncate">{t("vacancy.viewFullResume")}</h1>
        <button
          onClick={() => setReporting(true)}
          className="tap shrink-0 text-xs font-medium text-white/45 border border-base-700 rounded-full px-3 py-1.5"
        >
          {t("report.reportApplicant")}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-4">
        {r ? (
          <div
            className="rounded-xl shadow-xl mx-auto"
            style={{
              width: "100%",
              maxWidth: 400,
              padding: "28px 24px",
              fontFamily: "Manrope, sans-serif",
              ...getDocBackgroundStyle(theme, r?.backgroundUrl),
              color: theme.text,
              textAlign: align,
            }}
          >
            <div
              className={`flex gap-3 pb-4 mb-4 ${isCenter ? "flex-col items-center text-center" : "items-center"}`}
              style={{ borderBottom: `2px solid ${accent}` }}
            >
              <Avatar url={r.avatarUrl} name={r.fullName} accent={accent} theme={theme} />
              <div className="min-w-0">
                <h2 className="text-lg font-bold leading-tight truncate">{r.fullName || "—"}</h2>
                <p className="text-sm font-medium truncate" style={{ color: accent }}>
                  {r.role}
                </p>
              </div>
            </div>

            <div
              className={`flex flex-wrap gap-x-4 gap-y-1 text-[11px] mb-4 ${isCenter ? "justify-center" : ""}`}
              style={{ color: theme.textMed }}
            >
              {r.email && <span>{r.email}</span>}
              {r.phone && <span>{r.phone}</span>}
              {r.city && <span>{r.city}</span>}
            </div>

            {r.summary && (
              <section className="mb-4">
                <h3 className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: accent }}>
                  Про мене
                </h3>
                <p className="text-[12px] leading-relaxed" style={{ color: theme.text, opacity: 0.85 }}>
                  {r.summary}
                </p>
              </section>
            )}

            {(r.experience || []).length > 0 && (
              <section className="mb-4">
                <h3 className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: accent }}>
                  Досвід роботи
                </h3>
                <div className="space-y-3">
                  {r.experience.map((e) => (
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

            {(r.education || []).length > 0 && (
              <section className="mb-4">
                <h3 className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: accent }}>
                  Освіта
                </h3>
                <div className="space-y-2">
                  {r.education.map((e) => (
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

            {(r.skills || []).length > 0 && (
              <section className="mb-4">
                <h3 className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: accent }}>
                  Навички
                </h3>
                <div className={`flex flex-wrap gap-1.5 ${isCenter ? "justify-center" : ""}`}>
                  {r.skills.map((s) => (
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

            {(r.portfolio || []).length > 0 && (
              <section>
                <h3 className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: accent }}>
                  Портфоліо
                </h3>
                <div className="space-y-3">
                  {r.portfolio.map((p) => (
                    <div key={p.id}>
                      {p.title && <p className="text-[11.5px] font-semibold mb-1">{p.title}</p>}
                      <MediaPreview item={p} />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <p className="text-sm text-white/40 text-center py-10">{t("vacancy.noResumesYet")}</p>
        )}

        {(applicant.contact || applicant.message) && (
          <div className="bg-base-850 border border-base-700 rounded-xl p-4 mt-4 mx-auto" style={{ maxWidth: 400 }}>
            {applicant.contact && (
              <p className="text-xs text-white/60 mb-1">
                {t("vacancy.applicantContact")}: <span className="text-accent-300">{applicant.contact}</span>
              </p>
            )}
            {applicant.message && <p className="text-xs text-white/70 whitespace-pre-line">{applicant.message}</p>}
          </div>
        )}

        <div className="mx-auto mt-4" style={{ maxWidth: 400 }}>
          <MessageButton
            username={applicant.telegram_username}
            label={t("vacancy.messageApplicant")}
            disabledLabel={t("vacancy.noApplicantUsername")}
          />
        </div>
      </div>

      {reporting && (
        <ReportModal targetType="applicant" applicationId={applicant.id} onClose={() => setReporting(false)} />
      )}
    </div>
  );
}

export default function VacancyApplicants({ vacancy, applicants, loading, onBack }) {
  const { t } = useLanguage();
  const [openApplicant, setOpenApplicant] = useState(null);

  return (
    <div className="flex-1 flex flex-col bg-base-950">
      <div className="px-6 pt-2 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="tap w-8 h-8 flex items-center justify-center text-white/70">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 3L5 9l6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold truncate">{t("vacancy.applicants")}</h1>
          <p className="text-xs text-white/40 truncate">{vacancy?.position}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="text-white/40 text-sm py-10 text-center">{t("common.loading")}</div>
        ) : applicants.length === 0 ? (
          <div className="fade-up flex flex-col items-center justify-center text-center py-16 gap-2">
            <p className="text-sm text-white/50 max-w-[220px]">{t("vacancy.noApplicants")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {applicants.map((a) => {
              const r = a.resume_snapshot;
              return (
                <button
                  key={a.id}
                  onClick={() => setOpenApplicant(a)}
                  className="tap text-left bg-base-850 border border-base-700 rounded-xl p-4"
                >
                  {r ? (
                    <>
                      <p className="font-semibold text-sm">{r.fullName || "—"}</p>
                      <p className="text-xs text-white/50 mb-2">{r.role}</p>
                      {r.summary && <p className="text-xs text-white/70 mb-2 line-clamp-3">{r.summary}</p>}
                      {(r.skills || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {r.skills.map((s) => (
                            <span key={s} className="text-[10px] font-medium bg-accent-500/15 text-accent-300 rounded-full px-2 py-0.5">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-white/40 mb-2">{t("vacancy.noResumesYet")}</p>
                  )}
                  {a.contact && (
                    <p className="text-xs text-white/60 mb-1">
                      {t("vacancy.applicantContact")}: <span className="text-accent-300">{a.contact}</span>
                    </p>
                  )}
                  {a.message && <p className="text-xs text-white/70 whitespace-pre-line line-clamp-2">{a.message}</p>}

                  <p className="text-[11px] text-accent-300 font-medium mt-2">{t("vacancy.viewFullResume")} →</p>

                  <MessageButton
                    username={a.telegram_username}
                    label={t("vacancy.messageApplicant")}
                    disabledLabel={t("vacancy.noApplicantUsername")}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {openApplicant && (
        <ApplicantDetail applicant={openApplicant} onClose={() => setOpenApplicant(null)} t={t} />
      )}
    </div>
  );
}
