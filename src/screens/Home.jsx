import { useState } from "react";
import { useLanguage } from "../lib/i18n/index.jsx";
import { timeAgo } from "../lib/timeAgo.js";
import { buildShareLink } from "../lib/config.js";
import { getTelegramWebApp, confirmDialog } from "../lib/telegram.js";
import { sendLinkViaBot } from "../lib/shareSend.js";
import BG_URL from "../assets/bg-home.png";
import LOGO_URL from "../assets/logo.gif";

const DRAFT_BADGE = { uk: "Чернетка", ru: "Черновик", en: "Draft" };

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
  onView,
  onDelete,
  canCreateMore = true,
  maxResumes = 2,
  onOpenVacancies,
  onCreateVacancy,
  onBrowseVacancies,
  onOpenMyApplications,
  onOpenAdmin,
  onOpenBlockedUsers,
  isAdmin,
}) {
  const { lang, t } = useLanguage();
  const [activeResume, setActiveResume] = useState(null);
  const [sharing, setSharing] = useState(false);

  // Той самий сценарій "Поділитися", що й у Preview.jsx: усередині Telegram
  // надсилаємо посилання собі в ЛС через бота (sendMessage), поза Telegram
  // (або якщо надсилання через бота не вдалося з причини, не пов'язаної з
  // блокуванням бота) — відкриваємо стандартне вікно шерингу Telegram
  // (t.me/share/url).
  const openTelegramShareSheet = (r) => {
    const shareUrl = buildShareLink(r.id);
    const title = [r.fullName, r.role].filter(Boolean).join(" — ");
    const text = `${t("share.resumeClickHint")}\n\n${title}`;
    const tg = getTelegramWebApp();
    const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
    if (tg?.openTelegramLink) tg.openTelegramLink(telegramShareUrl);
    else if (tg?.openLink) tg.openLink(telegramShareUrl);
    else window.open(telegramShareUrl, "_blank");
  };

  const shareResume = async (r) => {
    const shareUrl = buildShareLink(r.id);
    const title = [r.fullName, r.role].filter(Boolean).join(" — ");

    const tgApp = getTelegramWebApp();
    if (tgApp) {
      setSharing(true);
      const result = await sendLinkViaBot({
        endpoint: "/api/resume-send",
        shareUrl,
        title,
        linkText: t("share.resumeClickHint"),
        forwardLabel: t("share.forwardButton"),
        t,
      });
      setSharing(false);
      if (result !== "fallback") {
        setActiveResume(null);
        return;
      }
    }

    openTelegramShareSheet(r);
    setActiveResume(null);
  };

  return (
    <div className="relative flex-1 flex flex-col bg-black overflow-hidden">
      {/* animated background */}
      <style>{`
        @keyframes cvdeck-drift {
          0%   { transform: scale(1.12) translate3d(0, 0, 0); }
          50%  { transform: scale(1.12) translate3d(-2%, -1.5%, 0); }
          100% { transform: scale(1.12) translate3d(0, 0, 0); }
        }
        .cvdeck-bg {
          animation: cvdeck-drift 26s ease-in-out infinite;
        }
      `}</style>
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="cvdeck-bg absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${BG_URL})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black" />
      </div>

      {/* content */}
      <div className="relative z-10 flex-1 flex flex-col">
        <div className="px-6 pt-4 pb-1 flex flex-col items-center text-center">
          <img src={LOGO_URL} alt="CV Deck" className="w-40 h-48 object-contain drop-shadow-[0_0_22px_rgba(255,190,90,0.45)]" />
        </div>

        <div className="px-6 pt-3 pb-5">
          <button
            onClick={onCreate}
            disabled={!canCreateMore}
            className="tap relative flex items-center justify-center gap-2 w-full bg-gradient-to-b from-amber-300 to-amber-500 text-black font-semibold text-sm rounded-full py-3.5 shadow-[0_4px_20px_rgba(245,180,60,0.35)] hover:brightness-105 disabled:from-white/30 disabled:to-white/20 disabled:text-black/50 disabled:shadow-none"
          >
            <span className="text-lg leading-none">+</span> {t("home.createNew")}
          </button>
          {!canCreateMore && (
            <p className="text-xs text-white/60 text-center mt-2">
              {t("home.limitReached", maxResumes)}
            </p>
          )}
        </div>

        <div className="px-6 pb-5 grid grid-cols-3 gap-2.5">
          <button
            onClick={onBrowseVacancies}
            className="tap flex flex-col items-center gap-2 bg-black/50 backdrop-blur-sm border border-amber-500/25 rounded-2xl px-2.5 py-4 text-center"
          >
            <span className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-base">
              🔍
            </span>
            <span className="text-[11px] font-medium text-amber-100/90 leading-tight">
              {t("home.browseVacancies")}
            </span>
          </button>
          <button
            onClick={onCreateVacancy}
            className="tap flex flex-col items-center gap-2 bg-black/50 backdrop-blur-sm border border-amber-500/25 rounded-2xl px-2.5 py-4 text-center"
          >
            <span className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-base">
              📋
            </span>
            <span className="text-[11px] font-medium text-amber-100/90 leading-tight">
              {t("home.createVacancy")}
            </span>
          </button>
          <button
            onClick={onOpenVacancies}
            className="tap flex flex-col items-center gap-2 bg-black/50 backdrop-blur-sm border border-amber-500/25 rounded-2xl px-2.5 py-4 text-center"
          >
            <span className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-base">
              🗂️
            </span>
            <span className="text-[11px] font-medium text-amber-100/90 leading-tight">
              {t("home.myVacancies")}
            </span>
          </button>
        </div>

        {onOpenMyApplications && (
          <div className="px-6 pb-5">
            <button
              onClick={onOpenMyApplications}
              className="tap w-full flex items-center justify-center gap-2 bg-black/50 backdrop-blur-sm border border-amber-500/25 rounded-2xl px-3.5 py-3"
            >
              <span className="text-base leading-none">📨</span>
              <span className="text-[13px] font-medium text-amber-100/90">{t("home.myApplications")}</span>
            </button>
          </div>
        )}

        {onOpenBlockedUsers && (
          <div className="px-6 pb-5 -mt-2">
            <button
              onClick={onOpenBlockedUsers}
              className="tap w-full flex items-center justify-center gap-2 bg-black/50 backdrop-blur-sm border border-amber-500/25 rounded-2xl px-3.5 py-3"
            >
              <span className="text-base leading-none">🚫</span>
              <span className="text-[13px] font-medium text-amber-100/90">{t("block.blockedListTitle")}</span>
            </button>
          </div>
        )}

        <div className="px-6 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="h-px flex-1 bg-amber-400/25" />
            <h2 className="font-semibold text-[13px] tracking-wide text-amber-100/80 whitespace-nowrap">
              {t("home.title")}
            </h2>
            <span className="h-px flex-1 bg-amber-400/25" />
            <span className="text-xs text-amber-100/50 font-medium border border-amber-400/25 rounded-full px-2 py-0.5 shrink-0">
              {resumes.length}/{maxResumes}
            </span>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center text-white/40 text-sm">{t("common.loading")}</div>
          ) : resumes.length === 0 ? (
            <div className="fade-up flex-1 flex flex-col items-center justify-center text-center pb-16 gap-2">
              <div className="w-14 h-14 rounded-2xl bg-black/50 border border-amber-500/25 flex items-center justify-center mb-1">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M6 3h9l4 4v14H6z" stroke="#f5c877" strokeWidth="1.5" />
                  <path d="M9 12h6M9 15h6M9 9h3" stroke="#f5c877" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-sm text-white/50 max-w-[220px]">
                {t("home.emptyHint")}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 overflow-y-auto pb-4">
              {resumes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setActiveResume(r)}
                  className="tap group flex items-center gap-3 bg-black/50 backdrop-blur-sm border border-amber-500/20 rounded-2xl px-3.5 py-3 text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 text-black font-semibold text-sm flex items-center justify-center shrink-0">
                    {initials(r.fullName || t("home.newResume"))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm truncate text-amber-50">
                        {r.role || t("home.noRole")}
                      </p>
                      {r.status === "draft" && (
                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-amber-300 bg-amber-500/15 border border-amber-400/30 rounded-full px-1.5 py-0.5">
                          {DRAFT_BADGE[lang] || DRAFT_BADGE.en}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/45">{timeAgo(r.updatedAt, t)}</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-amber-300/50 shrink-0">
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
              className="tap w-full flex items-center justify-center gap-2 bg-black/50 backdrop-blur-sm border border-amber-500/30 rounded-2xl px-3.5 py-3"
            >
              <span className="text-lg leading-none">🛠️</span>
              <span className="text-sm font-medium text-amber-200">{t("home.adminPanel")}</span>
            </button>
          </div>
        )}
      </div>

      {activeResume && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setActiveResume(null)} />
          <div className="relative w-full max-w-[420px] bg-base-900 border-t border-amber-500/25 rounded-t-2xl px-5 pt-4 pb-6 fade-up">
            <div className="w-9 h-1 rounded-full bg-white/15 mx-auto mb-4" />
            <p className="text-sm font-semibold text-white/90 truncate mb-0.5">
              {activeResume.fullName || t("home.newResume")}
            </p>
            <p className="text-xs text-white/45 mb-4 truncate">{activeResume.role || t("home.noRole")}</p>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => shareResume(activeResume)}
                disabled={sharing}
                className="tap w-full flex items-center gap-3 bg-base-850 border border-base-700 rounded-xl px-4 py-3 text-left text-sm font-medium text-white/90 disabled:opacity-60"
              >
                <span className="text-base leading-none">🔗</span> {sharing ? t("share.sending") : t("common.share")}
              </button>
              {onView && (
                <button
                  onClick={() => {
                    onView(activeResume.id);
                    setActiveResume(null);
                  }}
                  className="tap w-full flex items-center gap-3 bg-base-850 border border-base-700 rounded-xl px-4 py-3 text-left text-sm font-medium text-white/90"
                >
                  <span className="text-base leading-none">👁️</span> {t("common.view")}
                </button>
              )}
              <button
                onClick={() => {
                  onEdit(activeResume.id);
                  setActiveResume(null);
                }}
                className="tap w-full flex items-center gap-3 bg-base-850 border border-base-700 rounded-xl px-4 py-3 text-left text-sm font-medium text-white/90"
              >
                <span className="text-base leading-none">✏️</span> {t("common.edit")}
              </button>
              <button
                onClick={async () => {
                  if (!(await confirmDialog(t("common.confirmDeleteResume")))) return;
                  onDelete(activeResume.id);
                  setActiveResume(null);
                }}
                className="tap w-full flex items-center gap-3 bg-base-850 border border-base-700 rounded-xl px-4 py-3 text-left text-sm font-medium text-red-400"
              >
                <span className="text-base leading-none">🗑️</span> {t("common.delete")}
              </button>
            </div>

            <button
              onClick={() => setActiveResume(null)}
              className="tap w-full mt-3 text-center text-sm font-medium text-white/50 py-2"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
