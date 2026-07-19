import { useState } from "react";
import { useLanguage } from "../lib/i18n/index.jsx";
import { buildShareLink } from "../lib/config.js";
import { getTelegramWebApp } from "../lib/telegram.js";

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Оновлено щойно";
  if (min < 60) return `Оновлено ${min} хв тому`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `Оновлено ${hrs} год тому`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Оновлено вчора";
  return `Оновлено ${days} дн тому`;
}

const initials = (name) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

export default function Home({
  resumes,
  loading,
  onCreate,
  onEdit,
  onDelete,
  canCreateMore = true,
  maxResumes = 2,
  onOpenVacancies,
  onCreateVacancy,
  onBrowseVacancies,
  onOpenAdmin,
  isAdmin,
}) {
  const { t } = useLanguage();
  const [activeResume, setActiveResume] = useState(null);

  const shareResume = (r) => {
    const shareUrl = buildShareLink(r.id);
    const text = [r.fullName, r.role].filter(Boolean).join(" — ");
    const tg = getTelegramWebApp();
    const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
    if (tg?.openTelegramLink) tg.openTelegramLink(telegramShareUrl);
    else if (tg?.openLink) tg.openLink(telegramShareUrl);
    else window.open(telegramShareUrl, "_blank");
    setActiveResume(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-base-950">
      <div className="px-6 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent-500 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 3h10v2H2zM2 6h10v2H2zM2 9h7v2H2z" fill="black" />
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight">CV DECK</span>
          {isAdmin && (
            <span className="text-[10px] font-bold text-accent-300 bg-accent-500/20 rounded px-1.5 py-0.5 shadow-glow animate-pulse">
              PRO
            </span>
          )}
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="rounded-2xl bg-black p-5 shadow-glow relative overflow-hidden">
          <div className="absolute -right-6 -top-8 w-28 h-28 rounded-full bg-white/10 blur-2xl" />
          <h1 className="text-xl font-bold leading-snug mb-1.5 relative">
            Створіть резюме,
            <br />
            яке захочуть прочитати
          </h1>
          <p className="text-sm text-white/75 mb-4 relative">
            {canCreateMore
              ? "Професійне резюме за кілька хвилин з допомогою AI"
              : `Досягнуто ліміт ${maxResumes} резюме на акаунт. Видаліть одне, щоб створити нове.`}
          </p>
          <button
            onClick={onCreate}
            disabled={!canCreateMore}
            className="tap relative flex items-center justify-center gap-2 w-full bg-white text-black font-semibold text-sm rounded-xl py-3 hover:bg-white/90 disabled:bg-white/40 disabled:text-black/50"
          >
            <span className="text-lg leading-none">+</span> Створити резюме
          </button>
        </div>
      </div>

      <div className="px-6 pb-5 grid grid-cols-2 gap-2.5">
        <button
          onClick={onCreateVacancy}
          className="tap flex flex-col items-start gap-1 bg-base-850 border border-base-700 rounded-xl px-3.5 py-3 text-left"
        >
          <span className="text-lg leading-none">📋</span>
          <span className="text-xs font-medium text-white/85">{t("home.createVacancy")}</span>
        </button>
        <button
          onClick={onOpenVacancies}
          className="tap flex flex-col items-start gap-1 bg-base-850 border border-base-700 rounded-xl px-3.5 py-3 text-left"
        >
          <span className="text-lg leading-none">🗂️</span>
          <span className="text-xs font-medium text-white/85">{t("home.myVacancies")}</span>
        </button>
        <button
          onClick={onBrowseVacancies}
          className="tap flex flex-col items-start gap-1 bg-base-850 border border-base-700 rounded-xl px-3.5 py-3 text-left"
        >
          <span className="text-lg leading-none">🔍</span>
          <span className="text-xs font-medium text-white/85">{t("home.browseVacancies")}</span>
        </button>
      </div>

      <div className="px-6 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-[15px] text-white/90">Мої резюме</h2>
          <span className="text-xs text-white/40 font-medium">
            {resumes.length}/{maxResumes}
          </span>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-white/40 text-sm">Завантаження…</div>
        ) : resumes.length === 0 ? (
          <div className="fade-up flex-1 flex flex-col items-center justify-center text-center pb-16 gap-2">
            <div className="w-14 h-14 rounded-2xl bg-base-800 flex items-center justify-center mb-1">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M6 3h9l4 4v14H6z" stroke="#8b7fff" strokeWidth="1.5" />
                <path d="M9 12h6M9 15h6M9 9h3" stroke="#8b7fff" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm text-white/50 max-w-[220px]">
              Резюме поки немає. Створіть перше — це займе кілька хвилин.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 overflow-y-auto pb-4">
            {resumes.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveResume(r)}
                className="tap group flex items-center gap-3 bg-base-850 border border-base-700 rounded-xl px-3.5 py-3 text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-accent-500/20 text-accent-300 font-semibold text-sm flex items-center justify-center shrink-0">
                  {initials(r.fullName || "Нове резюме")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">
                    {r.role || "Без назви посади"}
                  </p>
                  <p className="text-xs text-white/45">{timeAgo(r.updatedAt)}</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white/25 shrink-0">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="px-6 pt-2 pb-4">
          <button
            onClick={onOpenAdmin}
            className="tap w-full flex items-center justify-center gap-2 bg-accent-500/15 border border-accent-500/30 rounded-xl px-3.5 py-3"
          >
            <span className="text-lg leading-none">🛠️</span>
            <span className="text-sm font-medium text-accent-300">{t("home.adminPanel")}</span>
          </button>
        </div>
      )}

      {activeResume && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setActiveResume(null)} />
          <div className="relative w-full max-w-[420px] bg-base-900 border-t border-base-700 rounded-t-2xl px-5 pt-4 pb-6 fade-up">
            <div className="w-9 h-1 rounded-full bg-white/15 mx-auto mb-4" />
            <p className="text-sm font-semibold text-white/90 truncate mb-0.5">
              {activeResume.fullName || "Нове резюме"}
            </p>
            <p className="text-xs text-white/45 mb-4 truncate">{activeResume.role || "Без назви посади"}</p>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => shareResume(activeResume)}
                className="tap w-full flex items-center gap-3 bg-base-850 border border-base-700 rounded-xl px-4 py-3 text-left text-sm font-medium text-white/90"
              >
                <span className="text-base leading-none">🔗</span> Поділитися
              </button>
              <button
                onClick={() => {
                  onEdit(activeResume.id);
                  setActiveResume(null);
                }}
                className="tap w-full flex items-center gap-3 bg-base-850 border border-base-700 rounded-xl px-4 py-3 text-left text-sm font-medium text-white/90"
              >
                <span className="text-base leading-none">✏️</span> Редагувати
              </button>
              <button
                onClick={() => {
                  onDelete(activeResume.id);
                  setActiveResume(null);
                }}
                className="tap w-full flex items-center gap-3 bg-base-850 border border-base-700 rounded-xl px-4 py-3 text-left text-sm font-medium text-red-400"
              >
                <span className="text-base leading-none">🗑️</span> Видалити
              </button>
            </div>

            <button
              onClick={() => setActiveResume(null)}
              className="tap w-full mt-3 text-center text-sm font-medium text-white/50 py-2"
            >
              Скасувати
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
