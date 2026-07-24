import { useState } from "react";
import PageBackground from "../components/PageBackground.jsx";
import { useLanguage } from "../lib/i18n/index.jsx";
import { timeAgo } from "../lib/timeAgo.js";
import { VACANCY_STATUS } from "../lib/vacancy.js";
import { buildVacancyShareLink } from "../lib/config.js";
import { getTelegramWebApp, confirmDialog } from "../lib/telegram.js";
import { sendLinkViaBot } from "../lib/shareSend.js";
import ShareChoiceSheet from "../components/ShareChoiceSheet.jsx";
import Avatar from "../components/Avatar.jsx";
import { getColorTheme, getCellBackgroundStyle } from "../lib/docTheme.js";

const TEMPLATE_ACCENTS = {
  minimal: "#4b5563",
  modern: "#6c5ce7",
  bold: "#ff7a59",
  classic: "#2f6fb0",
};

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
  onView,
  onDelete,
  onOpenApplicants,
  onPay,
  onSendToModeration,
  canCreateMore = true,
  maxVacancies = 5,
  onOpenBlockedUsers,
}) {
  const { t } = useLanguage();
  const [activeVacancy, setActiveVacancy] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [shareChoiceTarget, setShareChoiceTarget] = useState(null);

  const canPay =
    activeVacancy &&
    [VACANCY_STATUS.APPROVED, VACANCY_STATUS.ACTIVE, VACANCY_STATUS.PAUSED].includes(activeVacancy.status);

  const canSendToModeration =
    activeVacancy &&
    [VACANCY_STATUS.DRAFT, VACANCY_STATUS.REJECTED].includes(activeVacancy.status);

  // Той самий сценарій "Поділитися", що й у VacancyPreview.jsx: усередині
  // Telegram надсилаємо посилання собі в ЛС через бота (sendMessage), поза
  // Telegram (або якщо надсилання через бота не вдалося з причини, не
  // пов'язаної з блокуванням бота) — відкриваємо стандартне вікно шерингу
  // Telegram (t.me/share/url).
  const openTelegramShareSheet = (v) => {
    const shareUrl = buildVacancyShareLink(v.id);
    const title = [v.position, v.company].filter(Boolean).join(" — ");
    const text = `${t("share.vacancyClickHint")}\n\n${title}`;
    const tg = getTelegramWebApp();
    const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
    if (tg?.openTelegramLink) tg.openTelegramLink(telegramShareUrl);
    else if (tg?.openLink) tg.openLink(telegramShareUrl);
    else window.open(telegramShareUrl, "_blank");
  };

  const shareVacancy = async (v) => {
    const shareUrl = buildVacancyShareLink(v.id);
    const title = [v.position, v.company].filter(Boolean).join(" — ");

    const tgApp = getTelegramWebApp();
    if (tgApp) {
      setSharing(true);
      const result = await sendLinkViaBot({
        endpoint: "/api/vacancy-send",
        shareUrl,
        title,
        linkText: t("share.vacancyClickHint"),
        forwardLabel: t("share.forwardButton"),
        t,
      });
      setSharing(false);
      if (result !== "fallback") {
        setShareChoiceTarget(null);
        return;
      }
    }

    openTelegramShareSheet(v);
    setShareChoiceTarget(null);
  };

  return (
    <PageBackground>
<div className="flex-1 flex flex-col">

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
        {onOpenBlockedUsers && (
          <button
            onClick={onOpenBlockedUsers}
            className="tap w-full flex items-center justify-center gap-2 bg-base-900 border border-base-700 rounded-xl px-3.5 py-3 mt-2.5"
          >
            <span className="text-base leading-none">🚫</span>
            <span className="text-[13px] font-medium text-white/80">{t("block.blockedListTitle")}</span>
          </button>
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
          <div className="stagger flex flex-col gap-2.5">
            {vacancies.map((v) => (
              <div
                key={v.id}
                className="group bg-base-850 border border-base-700 rounded-xl px-3.5 py-3"
                style={getCellBackgroundStyle(v.backgroundUrl)}
              >
                <button
                  onClick={() => (onView ? onView(v.id) : setActiveVacancy(v))}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setActiveVacancy(v);
                  }}
                  className="tap flex items-center gap-3 w-full text-left"
                >
                  <Avatar
                    url={v.avatarUrl}
                    name={v.company || v.position}
                    accent={TEMPLATE_ACCENTS[v.template] || TEMPLATE_ACCENTS.minimal}
                    theme={getColorTheme(v.colorScheme)}
                    size={10}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{v.position || "—"}</p>
                    <p className="text-xs text-white/45 truncate">{v.company}</p>
                    <p className={`text-[11px] font-medium mt-1 ${STATUS_COLOR[v.status] || "text-white/45"}`}>
                      {t(`vacancy.status.${v.status}`)}
                      {v.status === VACANCY_STATUS.ACTIVE && v.expiresAt &&
                        ` · ${t("vacancy.activeUntilShort", new Date(v.expiresAt).toLocaleDateString())}`}
                      {v.topUntil && new Date(v.topUntil).getTime() > Date.now() && ` · ${t("vacancy.topBadge")}`}
                    </p>
                    <p className="text-[11px] text-white/35 mt-0.5">
                      {t("vacancy.viewsCount", v.viewsCount || 0)}
                    </p>
                    {v.createdAt && (
                      <p className="text-[11px] text-white/35 mt-0.5">{timeAgo(v.createdAt, t)}</p>
                    )}
                  </div>
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

      {activeVacancy && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setActiveVacancy(null)} />
          <div className="relative w-full max-w-[420px] bg-base-900 border-t border-base-700 rounded-t-2xl px-5 pt-4 pb-6 fade-up">
            <div className="w-9 h-1 rounded-full bg-white/15 mx-auto mb-4" />
            <p className="text-sm font-semibold text-white/90 truncate mb-0.5">{activeVacancy.position || "—"}</p>
            <p className="text-xs text-white/45 mb-4 truncate">{activeVacancy.company}</p>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setShareChoiceTarget(activeVacancy);
                  setActiveVacancy(null);
                }}
                className="tap w-full flex items-center gap-3 bg-base-850 border border-base-700 rounded-xl px-4 py-3 text-left text-sm font-medium text-white/90"
              >
                <span className="text-base leading-none">🔗</span> {t("common.share")}
              </button>
              {onView && (
                <button
                  onClick={() => {
                    onView(activeVacancy.id);
                    setActiveVacancy(null);
                  }}
                  className="tap w-full flex items-center gap-3 bg-base-850 border border-base-700 rounded-xl px-4 py-3 text-left text-sm font-medium text-white/90"
                >
                  <span className="text-base leading-none">👁️</span> {t("common.view")}
                </button>
              )}
              <button
                onClick={() => {
                  onEdit(activeVacancy.id);
                  setActiveVacancy(null);
                }}
                className="tap w-full flex items-center gap-3 bg-base-850 border border-base-700 rounded-xl px-4 py-3 text-left text-sm font-medium text-white/90"
              >
                <span className="text-base leading-none">✏️</span> {t("common.edit")}
              </button>
              {canSendToModeration && onSendToModeration && (
                <button
                  onClick={() => {
                    onSendToModeration(activeVacancy);
                    setActiveVacancy(null);
                  }}
                  className="tap w-full flex items-center gap-3 bg-base-850 border border-base-700 rounded-xl px-4 py-3 text-left text-sm font-medium text-white/90"
                >
                  <span className="text-base leading-none">📮</span> {t("vacancy.sendToModeration")}
                </button>
              )}
              {canPay && onPay && (
                <button
                  onClick={() => {
                    onPay(activeVacancy.id);
                    setActiveVacancy(null);
                  }}
                  className="tap w-full flex items-center gap-3 bg-accent-500/15 border border-accent-500/30 rounded-xl px-4 py-3 text-left text-sm font-medium text-accent-300"
                >
                  <span className="text-base leading-none">⭐</span>{" "}
                  {activeVacancy.status === VACANCY_STATUS.APPROVED ? t("vacancy.payAndPublish") : t("vacancy.extendListing")}
                </button>
              )}
              <button
                onClick={async () => {
                  if (!(await confirmDialog(t("common.confirmDeleteVacancy")))) return;
                  onDelete(activeVacancy.id);
                  setActiveVacancy(null);
                }}
                className="tap w-full flex items-center gap-3 bg-base-850 border border-base-700 rounded-xl px-4 py-3 text-left text-sm font-medium text-red-400"
              >
                <span className="text-base leading-none">🗑️</span> {t("common.delete")}
              </button>
            </div>

            <button
              onClick={() => setActiveVacancy(null)}
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
        onChooseBot={() => shareVacancy(shareChoiceTarget)}
        onChooseShare={() => {
          openTelegramShareSheet(shareChoiceTarget);
          setShareChoiceTarget(null);
        }}
      />
    </div>
</PageBackground>
  );
}
