import { useEffect, useMemo, useState } from "react";
import Avatar from "../components/Avatar.jsx";
import { getColorTheme, getCellBackgroundStyle } from "../lib/docTheme.js";
import { timeAgo } from "../lib/timeAgo.js";
import { useLanguage } from "../lib/i18n/index.jsx";
import { apiFetch, backendEnabled } from "../lib/api.js";
import { alertDialog } from "../lib/telegram.js";

const ACCENTS = { minimal: "#9aa0a6", modern: "#6c5ce7", bold: "#ff7a59", classic: "#4c9be8" };

export default function VacancyBrowse({ vacancies, loading, onBack, onOpen }) {
  const { t } = useLanguage();
  const [activeCity, setActiveCity] = useState("");
  const [query, setQuery] = useState("");
  const [subscriptions, setSubscriptions] = useState([]);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!backendEnabled) return;
    let cancelled = false;
    apiFetch("/api/vacancy-subscribe")
      .then((res) => {
        if (!cancelled) setSubscriptions(res?.subscriptions || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const allCities = useMemo(() => {
    const set = new Set();
    vacancies.forEach((v) => {
      if (v.city && v.city.trim()) set.add(v.city.trim());
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [vacancies]);

  const filtered = useMemo(() => {
    const terms = query
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    return vacancies.filter((v) => {
      const matchesCity = !activeCity || (v.city || "").trim() === activeCity;
      if (!matchesCity) return false;
      if (terms.length === 0) return true;

      const haystack = [
        v.position,
        v.company,
        v.city,
        v.salary,
        v.employmentType,
        v.description,
        v.requirements,
        ...(v.tags || []),
      ]
        .filter(Boolean)
        .join(" \u2022 ")
        .toLowerCase();

      return terms.every((term) => haystack.includes(term));
    });
  }, [vacancies, activeCity, query]);

  // Поточний фільтр вважається "підписаним", якщо серед збережених
  // підписок є рядок з тим самим query/city (порівнюємо після trim,
  // так само як їх зберігає бекенд).
  const trimmedQuery = query.trim();
  const activeSubscription = subscriptions.find(
    (s) => (s.query || "") === trimmedQuery && (s.city || "") === activeCity
  );
  const isSubscribed = Boolean(activeSubscription);

  const toggleSubscription = async () => {
    if (!backendEnabled || subscribing) return;

    if (isSubscribed) {
      setSubscribing(true);
      try {
        await apiFetch("/api/vacancy-subscribe", {
          method: "POST",
          body: { action: "delete", id: activeSubscription.id },
        });
        setSubscriptions((prev) => prev.filter((s) => s.id !== activeSubscription.id));
        await alertDialog(t("vacancy.unsubscribeSuccess"));
      } catch (err) {
        console.error("vacancy unsubscribe failed:", err.status, err.payload || err.message);
        await alertDialog(t("vacancy.subscribeFailed"));
      }
      setSubscribing(false);
      return;
    }

    if (!trimmedQuery && !activeCity) {
      await alertDialog(t("vacancy.subscribeNeedQuery"));
      return;
    }

    setSubscribing(true);
    try {
      const res = await apiFetch("/api/vacancy-subscribe", {
        method: "POST",
        body: { action: "save", query: trimmedQuery, city: activeCity },
      });
      setSubscriptions((prev) => [
        { id: res.id, query: trimmedQuery, city: activeCity, created_at: new Date().toISOString() },
        ...prev,
      ]);
      await alertDialog(res.notifyBlocked ? t("vacancy.subscribeAllowBot") : t("vacancy.subscribeSuccess"));
    } catch (err) {
      console.error("vacancy subscribe failed:", err.status, err.payload || err.message);
      await alertDialog(t("vacancy.subscribeFailed"));
    }
    setSubscribing(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-base-950">

      <div className="px-6 pt-2 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="tap w-8 h-8 flex items-center justify-center text-white/70">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 3L5 9l6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-bold flex-1">{t("vacancy.listTitle")}</h1>
        {backendEnabled && (
          <button
            onClick={toggleSubscription}
            disabled={subscribing}
            title={t("vacancy.subscribeBell")}
            className={`tap w-8 h-8 flex items-center justify-center rounded-full ${
              isSubscribed ? "bg-accent-500/15 text-accent-300" : "text-white/60"
            } ${subscribing ? "opacity-50" : ""}`}
          >
            <svg width="17" height="17" viewBox="0 0 17 17" fill={isSubscribed ? "currentColor" : "none"}>
              <path
                d="M8.5 2.2c-2.1 0-3.6 1.7-3.6 3.9v2.3c0 .5-.2 1.2-.5 1.6L3.4 11.4c-.6.8-.2 1.7.8 2 3 1 6.3 1 9.3 0 .9-.3 1.3-1.3.7-2l-1-1.4c-.3-.4-.5-1.1-.5-1.6V6.1c0-2.1-1.6-3.9-3.7-3.9z"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10.2 14c-.3.5-.9.9-1.7.9s-1.4-.4-1.7-.9"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
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

      {allCities.length > 0 && (
        <div className="px-6 pb-3">
          <p className="text-xs text-white/40 font-medium mb-2">{t("vacancy.filterByCity")}</p>
          <select
            value={activeCity}
            onChange={(e) => setActiveCity(e.target.value)}
            className="w-full bg-base-850 border border-base-700 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-accent-500"
          >
            <option value="">{t("vacancy.allCities")}</option>
            {allCities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
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
                style={getCellBackgroundStyle(v.backgroundUrl)}
              >
                <Avatar
                  url={v.avatarUrl}
                  name={v.company || v.position}
                  accent={ACCENTS[v.template] || ACCENTS.minimal}
                  theme={getColorTheme(v.colorScheme)}
                  size={10}
                />
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
                  {v.createdAt && (
                    <p className="text-[11px] text-white/35 mt-0.5">{timeAgo(v.createdAt, t)}</p>
                  )}
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
