import { useMemo, useState } from "react";
import { useLanguage } from "../lib/i18n/index.jsx";

export default function VacancyBrowse({ vacancies, loading, onBack, onOpen }) {
  const { t } = useLanguage();
  const [activeTags, setActiveTags] = useState([]);

  const allTags = useMemo(() => {
    const set = new Set();
    vacancies.forEach((v) => (v.tags || []).forEach((tg) => set.add(tg)));
    return [...set];
  }, [vacancies]);

  const toggleTag = (tg) =>
    setActiveTags((prev) => (prev.includes(tg) ? prev.filter((x) => x !== tg) : [...prev, tg]));

  const filtered = useMemo(() => {
    if (activeTags.length === 0) return vacancies;
    return vacancies.filter((v) => (v.tags || []).some((tg) => activeTags.includes(tg)));
  }, [vacancies, activeTags]);

  return (
    <div className="flex-1 flex flex-col bg-base-950">

      <div className="px-6 pt-2 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="tap w-8 h-8 flex items-center justify-center text-white/70">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 3L5 9l6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-bold">{t("vacancy.listTitle")}</h1>
      </div>

      {allTags.length > 0 && (
        <div className="px-6 pb-3">
          <p className="text-xs text-white/40 font-medium mb-2">{t("vacancy.filterByTags")}</p>
          <div className="flex flex-wrap gap-2">
            {allTags.map((tg) => (
              <button
                key={tg}
                onClick={() => toggleTag(tg)}
                className={`tap text-xs font-medium rounded-full px-3 py-1.5 border ${
                  activeTags.includes(tg) ? "bg-accent-500 border-accent-500 text-base-950" : "border-base-700 text-white/60"
                }`}
              >
                {tg}
              </button>
            ))}
            {activeTags.length > 0 && (
              <button onClick={() => setActiveTags([])} className="tap text-xs font-medium rounded-full px-3 py-1.5 text-accent-300">
                {t("vacancy.filterAll")}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 pb-4">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-white/40 text-sm py-10">
            {t("common.loading")}
          </div>
        ) : vacancies.length === 0 ? (
          <div className="fade-up flex flex-col items-center justify-center text-center py-16 gap-2">
            <p className="text-sm text-white/50 max-w-[220px]">{t("vacancy.noVacancies")}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="fade-up flex flex-col items-center justify-center text-center py-16 gap-2">
            <p className="text-sm text-white/50 max-w-[220px]">{t("vacancy.noMatchTags")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filtered.map((v) => (
              <button
                key={v.id}
                onClick={() => onOpen(v.id)}
                className="tap flex items-center gap-3 bg-base-850 border border-base-700 rounded-xl px-3.5 py-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{v.position || "—"}</p>
                    {v.topUntil && new Date(v.topUntil).getTime() > Date.now() && (
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-accent-300 bg-accent-500/15 border border-accent-500/30 rounded-full px-1.5 py-0.5">
                        {t("vacancy.topBadge")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/45 truncate">
                    {v.company}
                    {v.city ? ` · ${v.city}` : ""}
                  </p>
                  {v.salary && <p className="text-xs text-accent-300 mt-0.5">{v.salary}</p>}
                  {(v.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {v.tags.slice(0, 3).map((tg) => (
                        <span key={tg} className="text-[10px] font-medium text-white/50 bg-base-800 rounded-full px-2 py-0.5">
                          {tg}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white/25 shrink-0">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
