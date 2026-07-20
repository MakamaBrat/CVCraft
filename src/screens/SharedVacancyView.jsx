import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api.js";
import { VacancyDocument } from "./VacancyPreview.jsx";
import { useLanguage } from "../lib/i18n/index.jsx";

const MESSAGES = {
  loading: { uk: "Завантаження вакансії…", ru: "Загрузка вакансии…", en: "Loading job post…" },
  notFound: {
    uk: "Вакансію не знайдено або посилання застаріло.",
    ru: "Вакансия не найдена или ссылка устарела.",
    en: "Job post not found or the link is outdated.",
  },
  expired: {
    uk: "Термін розміщення цієї вакансії вже завершився.",
    ru: "Срок размещения этой вакансии уже завершился.",
    en: "This job post is no longer active.",
  },
  openApp: { uk: "Перейти до CV DECK", ru: "Перейти в CV DECK", en: "Open CV DECK" },
  browseMore: {
    uk: "Переглянути всі вакансії",
    ru: "Смотреть все вакансии",
    en: "Browse all job posts",
  },
};

// Публічний перегляд вакансії за посланням-запрошенням (startapp=v_<id>),
// без авторизації — аналог SharedView.jsx для резюме. Дані тягне з
// /api/vacancy-share, який віддає тільки active/paused вакансії.
export default function SharedVacancyView({ vacancyId, onOpenApp }) {
  const { lang } = useLanguage();
  const [vacancy, setVacancy] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await apiFetch(`/api/vacancy-share?id=${encodeURIComponent(vacancyId)}`);
        if (cancelled) return;
        if (res.expired) {
          setStatus("expired");
          return;
        }
        setVacancy(res.data);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("not-found");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [vacancyId]);

  if (status === "loading") {
    return (
      <div className="flex-1 flex flex-col bg-base-950">
        <div className="flex-1 flex items-center justify-center text-white/40 text-sm">{MESSAGES.loading[lang]}</div>
      </div>
    );
  }

  if (status === "not-found" || status === "expired") {
    return (
      <div className="flex-1 flex flex-col bg-base-950">
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-3">
          <p className="text-sm text-white/60">{MESSAGES[status === "expired" ? "expired" : "notFound"][lang]}</p>
          <button onClick={onOpenApp} className="tap text-sm text-accent-300 font-medium">
            {MESSAGES.openApp[lang]}
          </button>
        </div>
      </div>
    );
  }

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
        <VacancyDocument vacancy={vacancy} />

        <button
          onClick={onOpenApp}
          className="tap mt-5 w-full max-w-[400px] mx-auto flex items-center justify-center gap-2 bg-accent-500 text-base-950 font-semibold text-sm rounded-xl py-3.5"
        >
          {MESSAGES.browseMore[lang]}
        </button>
      </div>
    </div>
  );
}
