import { useEffect, useMemo, useState } from "react";
import PageBackground from "../components/PageBackground.jsx";
import Avatar from "../components/Avatar.jsx";
import { getColorTheme, getCellBackgroundStyle } from "../lib/docTheme.js";
import { timeAgo } from "../lib/timeAgo.js";
import { useLanguage } from "../lib/i18n/index.jsx";
import { apiFetch, backendEnabled } from "../lib/api.js";

const ACCENTS = { minimal: "#9aa0a6", modern: "#6c5ce7", bold: "#ff7a59", classic: "#4c9be8" };

// Окремий екран для вакансій, знайдених Online Surfer (парсером). На
// відміну від VacancyBrowse тягне свій список сам (/api/parsed-vacancies),
// бо ці вакансії живуть в окремій таблиці й не приходять з App.jsx.
export default function ParsedVacancyBrowse({ onBack, onOpen }) {
  const { t } = useLanguage();
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!backendEnabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    apiFetch("/api/parsed-vacancies")
      .then((res) => {
        if (!cancelled) setVacancies(res?.vacancies || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const terms = query
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (terms.length === 0) return vacancies;

    return vacancies.filter((v) => {
      const d = v.data || {};
      const haystack = [d.position, d.company, d.location, ...(d.tags || [])]
        .filter(Boolean)
        .join(" \u2022 ")
        .toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [vacancies, query]);

  return (
    <PageBackground>
      <div className="flex-1 flex flex-col">
        <div className="px-6 pt-2 pb-4 flex items-center gap-3">
          <button onClick={onBack} className="tap w-8 h-8 flex items-center justify-center text-white/70">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 3L5 9l6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-lg font-bold flex-1">{t("parsedVacancy.listTitle")}</h1>
        </div>

        <div className="px-6 pb-3">
          <div className="relative">
            <svg
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none"
            >
              <circle cx="6.5" cy="6.5" r="4.8" stroke="currentColor" strokeWidth="1.4" />
              <path d="M10.3 10.3L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("vacancy.searchPlaceholder")}
              className="w-full bg-base-850 border border-base-700 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-accent-500"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="tap absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-white/40"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
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
          ) : filtered.length === 0 ? (
            <div className="fade-up flex flex-col items-center justify-center text-center py-16 gap-2">
              <p className="text-sm text-white/50 max-w-[220px]">{t("vacancy.noMatchTags")}</p>
            </div>
          ) : (
            <div className="stagger flex flex-col gap-2.5">
              {filtered.map((v) => {
                const d = v.data || {};
                return (
                  <button
                    key={v.id}
                    onClick={() => onOpen(v.id, filtered.map((x) => x.id))}
                    className="tap flex items-center gap-3 bg-base-850 border border-base-700 rounded-xl px-3.5 py-3 text-left"
                    style={getCellBackgroundStyle(d.backgroundUrl)}
                  >
                    <Avatar
                      url={d.avatarUrl}
                      name={d.company || d.position}
                      accent={ACCENTS[d.template] || ACCENTS.minimal}
                      theme={getColorTheme(d.colorScheme)}
                      size={10}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{d.position || "—"}</p>
                      </div>
                      <p className="text-xs text-white/45 truncate">
                        {d.company}
                        {d.location ? ` · ${d.location}` : ""}
                      </p>
                      {v.created_at && (
                        <p className="text-[11px] text-white/35 mt-0.5">{timeAgo(v.created_at, t)}</p>
                      )}
                      {(d.tags || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {d.tags.slice(0, 3).map((tg) => (
                            <span key={tg} className="text-[10px] font-medium text-white/50 bg-base-800 rounded-full px-2 py-0.5">
                              {tg}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {v.external_url && (
                      <a
                        href={v.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title={t("parsedVacancy.siteLinkHint")}
                        className="tap shrink-0 w-7 h-7 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white/60"
                      >
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                          <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.3" />
                          <path d="M2 8h12M8 1.8c1.6 1.7 2.5 3.9 2.5 6.2s-.9 4.5-2.5 6.2c-1.6-1.7-2.5-3.9-2.5-6.2S6.4 3.5 8 1.8z" stroke="currentColor" strokeWidth="1.3" />
                        </svg>
                      </a>
                    )}
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white/25 shrink-0">
                      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageBackground>
  );
}
