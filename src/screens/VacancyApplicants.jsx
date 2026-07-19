import StatusBar from "../components/StatusBar.jsx";
import { useLanguage } from "../lib/i18n/index.jsx";

export default function VacancyApplicants({ vacancy, applicants, loading, onBack }) {
  const { t } = useLanguage();

  return (
    <div className="flex-1 flex flex-col bg-base-950">
      <StatusBar />
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
                <div key={a.id} className="bg-base-850 border border-base-700 rounded-xl p-4">
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
                  {a.message && <p className="text-xs text-white/70 whitespace-pre-line">{a.message}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
