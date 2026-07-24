import { useState } from "react";
import PageBackground from "../components/PageBackground.jsx";
import { MediaPreview } from "./Wizard.jsx";
import Avatar from "../components/Avatar.jsx";
import { backendEnabled } from "../lib/api.js";
import { buildShareLink } from "../lib/config.js";
import { sendLinkViaBot } from "../lib/shareSend.js";
import ShareChoiceSheet from "../components/ShareChoiceSheet.jsx";
import { getTelegramWebApp } from "../lib/telegram.js";
import { useLanguage } from "../lib/i18n/index.jsx";
import { getColorTheme, getAlign, getDocBackgroundStyle } from "../lib/docTheme.js";
import { calcAge, formatAge } from "../lib/age.js";

const ACCENTS = {
  minimal: "#4b5563",
  modern: "#6c5ce7",
  bold: "#ff7a59",
  classic: "#2f6fb0",
};

function ResumeDocument({ resume, t, lang }) {
  const accent = ACCENTS[resume.template] || ACCENTS.minimal;
  const theme = getColorTheme(resume.colorScheme);
  const align = getAlign(resume.align);
  const isCenter = align === "center";
  const age = calcAge(resume.birthDate);
  return (
    <div
      id="resume-doc"
      className="fade-up rounded-xl shadow-xl mx-auto"
      style={{
        width: "100%",
        maxWidth: 400,
        padding: "28px 24px",
        fontFamily: "Manrope, sans-serif",
        ...getDocBackgroundStyle(theme, resume.backgroundUrl),
        color: theme.text,
        textAlign: align,
      }}
    >
      <div
        className={`flex gap-3 pb-4 mb-4 ${isCenter ? "flex-col items-center text-center" : "items-center"}`}
        style={{ borderBottom: `2px solid ${accent}` }}
      >
        <Avatar url={resume.avatarUrl} name={resume.fullName} accent={accent} theme={theme} />
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-tight truncate">{resume.fullName || t("resume.namePlaceholder")}</h2>
          <p className="text-sm font-medium truncate" style={{ color: accent }}>
            {resume.role || t("resume.rolePlaceholder")}
          </p>
        </div>
      </div>

      <div
        className={`flex flex-wrap gap-x-4 gap-y-1 text-[11px] mb-4 ${isCenter ? "justify-center" : ""}`}
        style={{ color: theme.textMed }}
      >
        {resume.email && <span>{resume.email}</span>}
        {resume.phone && <span>{resume.phone}</span>}
        {resume.city && <span>{resume.city}</span>}
        {age != null && <span>{formatAge(age, lang)}</span>}
      </div>

      {resume.summary && (
        <section className="mb-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: accent }}>
            {t("resume.sections.about")}
          </h3>
          <p className="text-[12px] leading-relaxed" style={{ color: theme.text, opacity: 0.85 }}>
            {resume.summary}
          </p>
        </section>
      )}

      {resume.experience.length > 0 && (
        <section className="mb-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: accent }}>
            {t("resume.sections.experience")}
          </h3>
          <div className="space-y-3">
            {resume.experience.map((e) => (
              <div key={e.id}>
                <div className={`flex items-baseline gap-2 ${isCenter ? "flex-col" : "justify-between"}`}>
                  <p className="text-[12.5px] font-semibold">{e.position}</p>
                  <p className="text-[10px] shrink-0" style={{ color: theme.textFaint }}>
                    {e.period}
                  </p>
                </div>
                <p className="text-[11px] mb-1" style={{ color: theme.textMed }}>
                  {e.company}
                </p>
                {e.description && (
                  <p className="text-[11.5px] leading-relaxed" style={{ color: theme.text, opacity: 0.78 }}>
                    {e.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {resume.education.length > 0 && (
        <section className="mb-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: accent }}>
            {t("resume.sections.education")}
          </h3>
          <div className="space-y-2">
            {resume.education.map((e) => (
              <div key={e.id}>
                <div className={`flex items-baseline gap-2 ${isCenter ? "flex-col" : "justify-between"}`}>
                  <p className="text-[12.5px] font-semibold">{e.school}</p>
                  <p className="text-[10px] shrink-0" style={{ color: theme.textFaint }}>
                    {e.period}
                  </p>
                </div>
                {e.degree && (
                  <p className="text-[11px]" style={{ color: theme.textMed }}>
                    {e.degree}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {resume.skills.length > 0 && (
        <section className="mb-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: accent }}>
            {t("resume.sections.skills")}
          </h3>
          <div className={`flex flex-wrap gap-1.5 ${isCenter ? "justify-center" : ""}`}>
            {resume.skills.map((s) => (
              <span
                key={s}
                className="text-[10.5px] font-medium rounded-full px-2.5 py-1"
                style={{ background: `${accent}${theme.chipAlpha}`, color: accent }}
              >
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {(resume.portfolio || []).length > 0 && (
        <section>
          <h3 className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: accent }}>
            {t("resume.sections.portfolio")}
          </h3>
          <div className="space-y-3">
            {resume.portfolio.map((p) => (
              <div key={p.id}>
                {p.title && <p className="text-[11.5px] font-semibold mb-1">{p.title}</p>}
                <MediaPreview item={p} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function Preview({ resume, onBack, onDone }) {
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState(null);
  const [shareChoiceOpen, setShareChoiceOpen] = useState(false);
  const { t, lang } = useLanguage();

  const shareUrl = buildShareLink(resume.id);

  // Відкриває нативне вікно шерингу Telegram (t.me/share/url) — фолбек
  // для випадків поза Telegram або якщо надсилання через бота не вдалося.
  const openTelegramShareSheet = (title) => {
    const text = `${t("share.resumeClickHint")}\n\n${title}`;
    const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
    const tg = getTelegramWebApp();
    if (tg?.openTelegramLink) tg.openTelegramLink(telegramShareUrl);
    else if (tg?.openLink) tg.openLink(telegramShareUrl);
    else window.open(telegramShareUrl, "_blank");
  };

  const shareTitle = () => `${resume.fullName || t("resume.untitled")}${resume.role ? " — " + resume.role : ""}`;

  // Варіант "У бот" уточнюючого меню: надсилаємо повідомлення напряму
  // через бота (sendMessage у ЛС). Текст містить приховане у форматі
  // Telegram HTML гіперпосилання саме на це резюме (startapp=<id>), яке ми
  // повністю контролюємо — на відміну від стандартної кнопки "Відкрити в
  // Telegram", яку сам Telegram малює на прев'ю поза застосунком і чий URL
  // ми підмінити не можемо.
  const handleShareViaBot = async () => {
    setShareError(null);
    const title = shareTitle();

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
        setShareChoiceOpen(false);
        return;
      }
      // "fallback" — помилка не пов'язана з блокуванням бота (мережа,
      // сервер тощо): падаємо у стандартний Telegram-шеринг нижче.
    }

    openTelegramShareSheet(title);
    setShareChoiceOpen(false);
  };

  return (
    <PageBackground>
<div className="flex-1 flex flex-col">
      <div className="print:hidden">
        <div className="px-6 pt-2 pb-4 flex items-center gap-3">
          <button onClick={onBack} className="tap w-8 h-8 flex items-center justify-center text-white/70">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 3L5 9l6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-lg font-bold flex-1">{t("preview.title")}</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-4">
        <ResumeDocument resume={resume} t={t} lang={lang} />
      </div>

      {(resume.portfolio || []).length > 0 && (
        <p className="px-6 pb-2 text-[11px] text-white/35 print:hidden">
          {t("preview.portfolioFileHint")}
        </p>
      )}

      {!backendEnabled && (
        <p className="px-6 pb-2 text-[11px] text-amber-400/70 print:hidden">
          {t("preview.noBackendHint")}
        </p>
      )}

      {shareError && <p className="px-6 pb-2 text-[11px] text-red-400 print:hidden">{shareError}</p>}

      <div className="px-6 pb-6 print:hidden flex gap-3">
        <button
          onClick={() => setShareChoiceOpen(true)}
          disabled={sharing}
          className="tap flex-1 flex items-center justify-center gap-2 bg-accent-500 text-base-950 font-semibold text-sm rounded-xl py-3.5 disabled:opacity-60"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="11.5" cy="3.5" r="2" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="3.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="11.5" cy="11.5" r="2" stroke="currentColor" strokeWidth="1.3" />
            <path d="M5.3 6.5L9.7 4.3M5.3 8.5l4.4 2.2" stroke="currentColor" strokeWidth="1.3" />
          </svg>
          {sharing ? t("share.sending") : t("common.share")}
        </button>
        <button
          onClick={onDone}
          className="tap flex-1 flex items-center justify-center gap-2 bg-base-850 border border-base-700 text-white/85 font-medium text-sm rounded-xl py-3.5"
        >
          {t("common.save")}
        </button>
      </div>

      <ShareChoiceSheet
        open={shareChoiceOpen}
        sharing={sharing}
        onClose={() => setShareChoiceOpen(false)}
        onChooseBot={handleShareViaBot}
        onChooseShare={() => {
          openTelegramShareSheet(shareTitle());
          setShareChoiceOpen(false);
        }}
      />
    </div>
</PageBackground>
  );
}
