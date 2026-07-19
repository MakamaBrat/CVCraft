import StatusBar from "../components/StatusBar.jsx";
import { useLanguage } from "../lib/i18n/index.jsx";
import { VACANCY_STATUS } from "../lib/vacancy.js";

const STATUS_COLOR = {
  [VACANCY_STATUS.DRAFT]: "text-white/45",
  [VACANCY_STATUS.PENDING_REVIEW]: "text-amber-400",
  [VACANCY_STATUS.APPROVED]: "text-sky-400",
  [VACANCY_STATUS.REJECTED]: "text-red-400",
  [VACANCY_STATUS.ACTIVE]: "text-emerald-400",
  [VACANCY_STATUS.PAUSED]: "text-white/45",
};

export default function VacancyList({
  vacancies,
  loading,
  onBack,
  onCreate,
  onEdit,
  onDelete,
  onOpenApplicants,
  canCreateMore = true,
  maxVacancies = 5,
}) {
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
        <h1 className="text-lg font-bold flex-1">{t("home.myVacancies")}</h1>
        <span className="text-xs text-white/40 font-medium">
          {vacancies.length}/{maxVacancies}
        </span>
      </div>

      <div className="px-6 pb-4">
        <button
          onClick={onCreate}
          disabled={!canCreateMore}
          className="tap w-full flex items-center justify-center gap-2 bg-accent-500 disabled:bg-base-700 disabled:text-white/30 text-base-950 font-semibold text-sm rounded-xl py-3"
        >
          <span className="text-lg leading-none">+</span> {t("home.createVacancy")}
        </button>
        {!canCreateMore && (
          <p className="text-xs text-amber-400/70 mt-2">{t("vacancy.limitReached", maxVacancies)}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-4">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-white/40 text-sm py-10">
            {t("common.loading")}
          </div>
        ) : vacancies.length === 0 ? (
          <div className="fade-up flex flex-col items-center justify-center text-center py-16 gap-2">
            <p className="text-sm text-white/50 max-w-[220px]">{t("vacancy.noVacancies")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {vacancies.map((v) => (
              <div key={v.id} className="group bg-base-850 border border-base-700 rounded-xl px-3.5 py-3">
                <button onClick={() => onEdit(v.id)} className="tap flex items-center gap-3 w-full text-left">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{v.position || "—"}</p>
                    <p className="text-xs text-white/45 truncate">{v.company}</p>
                    <p className={`text-[11px] font-medium mt-1 ${STATUS_COLOR[v.status] || "text-white/45"}`}>
                      {t(`vacancy.status.${v.status}`)}
                      {v.status === VACANCY_STATUS.ACTIVE && ` · ${t("vacancy.showsLeft", (v.showsPurchased || 0) - (v.showsUsed || 0))}`}
                    </p>
                  </div>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(v.id);
                    }}
                    className="tap opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 text-xs px-2 py-1"
                  >
                    {t("common.delete")}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white/25 shrink-0">
                    <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {onOpenApplicants && (
                  <button
                    onClick={() => onOpenApplicants(v.id)}
                    className="tap mt-2 w-full text-xs font-medium text-accent-300 border border-accent-500/30 rounded-lg py-2"
                  >
                    {t("vacancy.viewApplicants")}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
