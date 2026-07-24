import { useEffect, useState } from "react";
import PageBackground from "../components/PageBackground.jsx";
import Avatar from "../components/Avatar.jsx";
import { getColorTheme } from "../lib/docTheme.js";
import { useLanguage } from "../lib/i18n/index.jsx";
import { apiFetch, backendEnabled } from "../lib/api.js";

const ACCENTS = { minimal: "#9aa0a6", modern: "#6c5ce7", bold: "#ff7a59", classic: "#4c9be8" };

// Деталі спарсеної вакансії. Простіше за VacancyDetail: без відгуків,
// без модерації, без апруву — тут тільки перегляд + перехід на оригінал.
export default function ParsedVacancyDetail({ vacancyId, onBack, onNavPrev, onNavNext, canNavPrev, canNavNext }) {
  const { t } = useLanguage();
  const [vacancy, setVacancy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!backendEnabled || !vacancyId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiFetch(`/api/parsed-vacancies?id=${encodeURIComponent(vacancyId)}`)
      .then((res) => {
        if (!cancelled) setVacancy(res?.vacancy || null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [vacancyId]);

  const d = vacancy?.data || {};

  return (
    <PageBackground>
      <div className="flex-1 flex flex-col">
        <div className="px-6 pt-2 pb-4 flex items-center gap-3">
          <button onClick={onBack} className="tap w-8 h-8 flex items-center justify-center text-white/70">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 3L5 9l6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-lg font-bold flex-1 truncate">{d.position || t("parsedVacancy.listTitle")}</h1>
          {vacancy?.external_url && (
            <a
              href={vacancy.external_url}
              target="_blank"
              rel="noopener noreferrer"
              title={t("parsedVacancy.siteLinkHint")}
              className="tap shrink-0 w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white/60"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.3" />
                <path d="M2 8h12M8 1.8c1.6 1.7 2.5 3.9 2.5 6.2s-.9 4.5-2.5 6.2c-1.6-1.7-2.5-3.9-2.5-6.2S6.4 3.5 8 1.8z" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            </a>
          )}
          {canNavPrev && (
            <button onClick={onNavPrev} className="tap w-8 h-8 flex items-center justify-center text-white/60">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3l-5 5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          {canNavNext && (
            <button onClick={onNavNext} className="tap w-8 h-8 flex items-center justify-center text-white/60">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-white/40 text-sm py-10">
              {t("common.loading")}
            </div>
          ) : !vacancy ? (
            <div className="fade-up flex flex-col items-center justify-center text-center py-16 gap-2">
              <p className="text-sm text-white/50 max-w-[220px]">{t("vacancy.noVacancies")}</p>
            </div>
          ) : (
            <div className="fade-up flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Avatar
                  url={d.avatarUrl}
                  name={d.company || d.position}
                  accent={ACCENTS[d.template] || ACCENTS.minimal}
                  theme={getColorTheme(d.colorScheme)}
                  size={14}
                />
                <div className="min-w-0">
                  <p className="font-semibold truncate">{d.position || "—"}</p>
                  <p className="text-sm text-white/50 truncate">
                    {d.company}
                    {d.location ? ` · ${d.location}` : ""}
                  </p>
                </div>
              </div>

              {(d.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {d.tags.map((tg) => (
                    <span key={tg} className="text-[10px] font-medium text-white/50 bg-base-800 rounded-full px-2 py-0.5">
                      {tg}
                    </span>
                  ))}
                </div>
              )}

              {d.description && (
                <div>
                  <p className="text-xs text-white/40 font-medium mb-1">{t("vacancy.descriptionLabel")}</p>
                  <p className="text-sm text-white/80 whitespace-pre-wrap">{d.description}</p>
                </div>
              )}

              {d.requirements && (
                <div>
                  <p className="text-xs text-white/40 font-medium mb-1">{t("vacancy.requirementsLabel")}</p>
                  <p className="text-sm text-white/80 whitespace-pre-wrap">{d.requirements}</p>
                </div>
              )}

              {vacancy.external_url && (
                <a
                  href={vacancy.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tap mt-2 flex items-center justify-center gap-2 bg-accent-500 text-white rounded-xl py-3 text-sm font-medium"
                >
                  {t("parsedVacancy.openOriginal")}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </PageBackground>
  );
}
