import { useState } from "react";
import { useLanguage } from "../lib/i18n/index.jsx";
import { timeAgo } from "../lib/timeAgo.js";
import { buildShareLink } from "../lib/config.js";
import { getTelegramWebApp, confirmDialog } from "../lib/telegram.js";
import { sendLinkViaBot } from "../lib/shareSend.js";
import ShareChoiceSheet from "../components/ShareChoiceSheet.jsx";
import Avatar from "../components/Avatar.jsx";
import PageBackground from "../components/PageBackground.jsx";
import { getColorTheme, getCellBackgroundStyle } from "../lib/docTheme.js";
import LOGO_URL from "../assets/logo.gif";

const TEMPLATE_ACCENTS = {
  minimal: "#4b5563",
  modern: "#6c5ce7",
  bold: "#ff7a59",
  classic: "#2f6fb0",
};

const DRAFT_BADGE = { uk: "Чернетка", ru: "Черновик", en: "Draft" };

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
  isAdmin,
}) {
  const { lang, t, setLang, supported } = useLanguage();
  const [activeResume, setActiveResume] = useState(null);
  const [sharing, setSharing] = useState(false);
  // Ціль для уточнюючого меню "У бот" / "Поділитися", яке з'являється
  // після натискання кнопки "Поділитися" в меню дій резюме.
  const [shareChoiceTarget, setShareChoiceTarget] = useState(null);

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
        setShareChoiceTarget(null);
        return;
      }
    }

    openTelegramShareSheet(r);
    setShareChoiceTarget(null);
  };

  return (
    <PageBackground>
        <div className="px-6 pt-4 pb-1 relative flex flex-col items-center text-center logo-fade">
          <button
            onClick={() => {
              const list = supported;
              const idx = list.indexOf(lang);
              setLang(list[(idx + 1) % list.length]);
            }}
            className="tap absolute right-6 top-4 w-8 h-8 flex items-center justify-center text-[11px] font-semibold uppercase text-amber-100/85 bg-black/50 backdrop-blur-sm border border-amber-500/25 rounded-full"
          >
            {lang}
          </button>
          <img src={LOGO_URL} alt="CV Deck" className="w-40 h-48 object-contain drop-shadow-[0_0_22px_rgba(255,190,90,0.45)]" />
        </div>

        <div className="stagger px-6 pb-5 grid grid-cols-3 gap-2.5">
          <button
            onClick={onBrowseVacancies}
            className="tap flex flex-col items-center gap-1.5 bg-black/50 backdrop-blur-sm border border-amber-500/25 rounded-xl px-2 py-2.5 text-center"
          >
            <span className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-sm">
              🔍
            </span>
            <span className="text-[11px] font-medium text-amber-100/90 leading-tight">
              {t("home.browseVacancies")}
            </span>
          </button>
          <button
            onClick={onCreate}
            disabled={!canCreateMore}
            className={`tap flex flex-col items-center gap-1.5 rounded-xl px-2 py-2.5 text-center ${
              canCreateMore
                ? "bg-gradient-to-b from-amber-300 to-amber-500"
                : "bg-black/50 backdrop-blur-sm border border-amber-500/25"
            }`}
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${
                canCreateMore ? "bg-black/15 border border-black/20 text-black" : "bg-amber-500/15 border border-amber-400/30 text-amber-100/50"
              }`}
            >
              +
            </span>
            <span className={`text-[11px] font-semibold leading-tight ${canCreateMore ? "text-black" : "text-amber-100/50"}`}>
              {t("home.createNew")}
            </span>
          </button>
          <button
            onClick={onOpenVacancies}
            className="tap flex flex-col items-center gap-1.5 bg-black/50 backdrop-blur-sm border border-amber-500/25 rounded-xl px-2 py-2.5 text-center"
          >
            <span className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-sm">
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

        <div className="px-6 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="h-px flex-1 bg-amber-400/25" />
            <h2 className="font-semibold text-[13px] tracking-wide text-amber-100/80 whitespace-nowrap">
              {t("home.title")}
            </h2>
            <span className="h-px flex-1 bg-amber-400/25" />
            <span
              className={`text-xs font-medium rounded-full px-2 py-0.5 shrink-0 border ${
                resumes.length >= maxResumes
                  ? "bg-amber-500 border-amber-500 text-black"
                  : "border-amber-400/25 text-amber-100/50"
              }`}
            >
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
            <div className="stagger flex flex-col gap-2.5 overflow-y-auto pb-4">
              {resumes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setActiveResume(r)}
                  className="tap group flex items-center gap-3 bg-black/50 backdrop-blur-sm border border-amber-500/20 rounded-2xl px-3.5 py-3 text-left"
                  style={getCellBackgroundStyle(r.backgroundUrl)}
                >
                  <Avatar
                    url={r.avatarUrl}
                    name={r.fullName || t("home.newResume")}
                    accent={TEMPLATE_ACCENTS[r.template] || TEMPLATE_ACCENTS.minimal}
                    theme={getColorTheme(r.colorScheme)}
                    size={10}
                  />
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
                onClick={() => {
                  setShareChoiceTarget(activeResume);
                  setActiveResume(null);
                }}
                className="tap w-full flex items-center gap-3 bg-base-850 border border-base-700 rounded-xl px-4 py-3 text-left text-sm font-medium text-white/90"
              >
                <span className="text-base leading-none">🔗</span> {t("common.share")}
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

      <ShareChoiceSheet
        open={!!shareChoiceTarget}
        sharing={sharing}
        onClose={() => setShareChoiceTarget(null)}
        onChooseBot={() => shareResume(shareChoiceTarget)}
        onChooseShare={() => {
          openTelegramShareSheet(shareChoiceTarget);
          setShareChoiceTarget(null);
        }}
      />
    </PageBackground>
  );
}
