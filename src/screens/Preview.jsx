import { useState } from "react";
import { MediaPreview } from "./Wizard.jsx";
import Avatar from "../components/Avatar.jsx";
import { apiFetch, backendEnabled } from "../lib/api.js";
import { buildShareLink } from "../lib/config.js";
import { generateResumeHtml } from "../lib/htmlExport.js";
import { getTelegramWebApp, alertDialog } from "../lib/telegram.js";
import { useLanguage } from "../lib/i18n/index.jsx";
import { getColorTheme, getAlign, getDocBackgroundStyle } from "../lib/docTheme.js";

const ACCENTS = {
  minimal: "#4b5563",
  modern: "#6c5ce7",
  bold: "#ff7a59",
  classic: "#2f6fb0",
};

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function ResumeDocument({ resume, t }) {
  const accent = ACCENTS[resume.template] || ACCENTS.minimal;
  const theme = getColorTheme(resume.colorScheme);
  const align = getAlign(resume.align);
  const isCenter = align === "center";
  return (
    <div
      id="resume-doc"
      className="rounded-xl shadow-xl mx-auto"
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
  const { t, lang } = useLanguage();

  const shareUrl = buildShareLink(resume.id);

  const handleShareLink = () => {
    const title = `${resume.fullName || t("resume.untitled")}${resume.role ? " — " + resume.role : ""}`;
    // url передаємо окремим параметром — Telegram сам зробить з нього
    // клікабельну картку-прев'ю під текстом, тому саме посилання в text
    // дублювати не треба.
    const text = `${t("share.resumeClickHint")}\n\n${title}`;
    const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
    const tg = getTelegramWebApp();
    if (tg?.openTelegramLink) tg.openTelegramLink(telegramShareUrl);
    else if (tg?.openLink) tg.openLink(telegramShareUrl);
    else window.open(telegramShareUrl, "_blank");
  };

  const handleShare = async () => {
    setShareError(null);
    setSharing(true);
    let blob, fileName;
    try {
      ({ blob, fileName } = await generateResumeHtml(resume, { shareUrl, lang }));
    } catch (err) {
      console.error("[Preview] html generation failed", err);
      setShareError(t("preview.htmlGenFailed")(err?.message || t("preview.unknownError")));
      setSharing(false);
      return;
    }

    const title = `${resume.fullName || t("resume.untitled")}${resume.role ? " — " + resume.role : ""}`;
    // Тут файл (HTML) іде окремо від "url", тож Web Share API не завжди
    // будує з url клікабельну картку — лишаємо посилання явно в тексті,
    // але за локалізованою підказкою замість голого "Відкрийте застосунок…".
    const caption = [title, "", t("share.resumeClickHint"), shareUrl].join("\n");

    // Усередині Telegram — надсилаємо файл напряму через бота (sendDocument
    // у ЛС). Це головний шлях: підпис до документа містить приховане
    // посилання саме на це резюме (startapp=<id>), яке ми повністю
    // контролюємо — на відміну від стандартної кнопки "Відкрити в Telegram",
    // яку сам Telegram малює на прев'ю файлу поза застосунком і чий URL ми
    // підмінити не можемо.
    const tgApp = getTelegramWebApp();
    if (tgApp) {
      try {
        const fileBase64 = await blobToBase64(blob);
        await apiFetch("/api/resume-send", {
          method: "POST",
          body: { htmlBase64: fileBase64, fileName, shareUrl, caption, title },
        });
        await alertDialog(t("share.sentToBot"));
        setSharing(false);
        return;
      } catch (err) {
        console.error("[Preview] bot send failed, falling back", err);
        // падаємо в старий флоу нижче (Web Share / завантаження)
      }
    }

    // Web Share API з файлом — одна дія одразу шерить і HTML-файл, і
    // посилання з підписом. Файл уже готовий (blob), тож якщо сам крок
    // "поділитися" впаде (буває в деяких мобільних вебв'ю навіть коли
    // canShare сказав "можна") — не показуємо жорстку помилку, а падаємо
    // назад на завантаження файлу + відкриття Telegram-шерингу окремо.
    try {
      const file = new File([blob], fileName, { type: "text/html" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: caption, title: fileName });
        setSharing(false);
        return;
      }
    } catch (err) {
      if (err?.name === "AbortError") {
        setSharing(false);
        return; // користувач сам закрив системне вікно шерингу
      }
      console.error("[Preview] navigator.share failed, falling back to download", err);
    }

    try {
      // Фолбек: качаємо HTML-файл і одразу відкриваємо Telegram-шеринг.
      // Тут url іде окремим параметром, тому в text лишаємо тільки
      // локалізовану підказку — Telegram сам покаже посилання як
      // клікабельну картку.
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);

      const shareText = `${t("share.resumeClickHint")}\n\n${title}`;
      const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
      const tg = getTelegramWebApp();
      if (tg?.openTelegramLink) tg.openTelegramLink(telegramShareUrl);
      else if (tg?.openLink) tg.openLink(telegramShareUrl);
      else window.open(telegramShareUrl, "_blank");
    } catch (err) {
      console.error("[Preview] download fallback failed", err);
      setShareError(t("preview.shareFailed")(err?.message || t("preview.unknownError")));
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-base-950">
      <div className="print:hidden">
        <div className="px-6 pt-2 pb-4 flex items-center gap-3">
          <button onClick={onBack} className="tap w-8 h-8 flex items-center justify-center text-white/70">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 3L5 9l6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-lg font-bold flex-1">{t("preview.title")}</h1>
          <button
            onClick={handleShare}
            disabled={sharing}
            title={t("preview.htmlFileTitle")}
            className="tap w-9 h-9 flex items-center justify-center text-white/70 bg-base-850 border border-base-700 rounded-lg disabled:opacity-50"
          >
            {sharing ? (
              <span className="text-[10px]">…</span>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M4 2h8v3H4zM3 6h10a1 1 0 011 1v4a1 1 0 01-1 1h-1v2H4v-2H3a1 1 0 01-1-1V7a1 1 0 011-1z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-4">
        <ResumeDocument resume={resume} t={t} />
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
          onClick={handleShareLink}
          className="tap flex-1 flex items-center justify-center gap-2 bg-accent-500 text-base-950 font-semibold text-sm rounded-xl py-3.5"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="11.5" cy="3.5" r="2" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="3.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="11.5" cy="11.5" r="2" stroke="currentColor" strokeWidth="1.3" />
            <path d="M5.3 6.5L9.7 4.3M5.3 8.5l4.4 2.2" stroke="currentColor" strokeWidth="1.3" />
          </svg>
          {t("common.share")}
        </button>
        <button
          onClick={onDone}
          className="tap flex-1 flex items-center justify-center gap-2 bg-base-850 border border-base-700 text-white/85 font-medium text-sm rounded-xl py-3.5"
        >
          {t("common.save")}
        </button>
      </div>
    </div>
  );
}
