import { useEffect, useState } from "react";
import PageBackground from "../components/PageBackground.jsx";
import Avatar from "../components/Avatar.jsx";
import { getColorTheme } from "../lib/docTheme.js";
import { apiFetch } from "../lib/api.js";
import { useLanguage } from "../lib/i18n/index.jsx";
import { confirmDialog } from "../lib/telegram.js";

const ACCENTS = { minimal: "#9aa0a6", modern: "#6c5ce7", bold: "#ff7a59", classic: "#4c9be8" };

const WITHDRAW_CONFIRM = {
  uk: "Забрати цей відгук? Дію не можна скасувати — щоб відгукнутися знову, доведеться відправити заявку заново.",
  ru: "Забрать этот отклик? Действие нельзя отменить — чтобы откликнуться снова, придётся отправить заявку заново.",
  en: "Withdraw this application? This can't be undone — you'll need to reapply from scratch.",
};

const WITHDRAW_LABEL = { uk: "Забрати", ru: "Забрать", en: "Withdraw" };

const STATUS_LABEL = {
  pending: { uk: "На розгляді", ru: "На рассмотрении", en: "Pending" },
  viewed: { uk: "Переглянуто", ru: "Просмотрено", en: "Viewed" },
  accepted: { uk: "Прийнято", ru: "Принято", en: "Accepted" },
  rejected: { uk: "Відхилено", ru: "Отклонено", en: "Rejected" },
};

const STATUS_COLOR = {
  pending: "text-white/45",
  viewed: "text-sky-400",
  accepted: "text-emerald-400",
  rejected: "text-red-400",
};

// Очікує ендпоінт /api/my-applications (за аналогією з /api/vacancies,
// /api/resumes у цьому проєкті) у форматі { applications: [...] }, де
// кожен елемент — { id, appliedAt, status, vacancy: <vacancyFromRow-сумісний рядок> }.
// Бекенд-частину (сам ендпоінт + таблицю відгуків, якщо її ще нема) треба
// додати окремо — тут лише підключення фронтенда під цей контракт.
export default function VacancyMyApplications({ onBack, onOpen, onWithdraw }) {
  const { lang, t } = useLanguage();
  const [applications, setApplications] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState(null);

  const handleWithdraw = async (e, a) => {
    e.stopPropagation();
    if (!onWithdraw || withdrawingId) return;
    if (!(await confirmDialog(WITHDRAW_CONFIRM[lang]))) return;
    setWithdrawingId(a.id);
    const ok = await onWithdraw(a.vacancy?.id);
    setWithdrawingId(null);
    if (ok) setApplications((prev) => (prev || []).filter((x) => x.id !== a.id));
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const res = await apiFetch("/api/my-applications");
        if (!cancelled) setApplications(res?.applications || []);
      } catch (err) {
        console.error("[VacancyMyApplications] failed to load", err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageBackground>
<div className="flex-1 flex flex-col">
      <div className="px-6 pt-2 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="tap w-8 h-8 flex items-center justify-center text-white/70">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 3L5 9l6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-bold">{t("vacancy.myApplications")}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="text-white/40 text-sm py-10 text-center">{t("common.loading")}</div>
        ) : error ? (
          <div className="fade-up flex flex-col items-center justify-center text-center py-16 gap-2">
            <p className="text-sm text-white/50 max-w-[220px]">{t("vacancy.loadApplicationsError")}</p>
          </div>
        ) : !applications || applications.length === 0 ? (
          <div className="fade-up flex flex-col items-center justify-center text-center py-16 gap-2">
            <p className="text-sm text-white/50 max-w-[220px]">{t("vacancy.noMyApplications")}</p>
          </div>
        ) : (
          <div className="stagger flex flex-col gap-2.5">
            {applications.map((a) => {
              const v = a.vacancy || {};
              return (
                <button
                  key={a.id}
                  onClick={() => onOpen(v)}
                  className="tap flex items-center gap-3 bg-base-850 border border-base-700 rounded-xl px-3.5 py-3 text-left"
                >
                  <Avatar
                    url={v.avatarUrl}
                    name={v.company || v.position}
                    accent={ACCENTS[v.template] || ACCENTS.minimal}
                    theme={getColorTheme(v.colorScheme)}
                    size={10}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{v.position || "—"}</p>
                    <p className="text-xs text-white/45 truncate">
                      {v.company}
                      {v.city ? ` · ${v.city}` : ""}
                    </p>
                    <p className={`text-[11px] font-medium mt-1 ${STATUS_COLOR[a.status] || "text-white/45"}`}>
                      {(STATUS_LABEL[a.status] || STATUS_LABEL.pending)[lang]}
                    </p>
                  </div>
                  {onWithdraw && (
                    <span
                      role="button"
                      onClick={(e) => handleWithdraw(e, a)}
                      className="tap shrink-0 text-[11px] font-medium text-red-400/70 border border-base-700 rounded-full px-2.5 py-1"
                    >
                      {withdrawingId === a.id ? t("common.loading") : WITHDRAW_LABEL[lang]}
                    </span>
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
