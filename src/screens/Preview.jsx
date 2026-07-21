import { useState } from "react";
import { MediaPreview } from "./Wizard.jsx";
import Avatar from "../components/Avatar.jsx";
import { backendEnabled, apiFetch } from "../lib/api.js";
import { buildShareLink, TELEGRAM_BOT_USERNAME } from "../lib/config.js";
import { generateResumeHtml } from "../lib/htmlExport.js";
import { getTelegramWebApp } from "../lib/telegram.js";
import { useLanguage } from "../lib/i18n/index.jsx";
import { getColorTheme, getAlign, getDocBackgroundStyle } from "../lib/docTheme.js";

const ACCENTS = {
  minimal: "#4b5563",
  modern: "#6c5ce7",
  bold: "#ff7a59",
  classic: "#2f6fb0",
};

function ResumeDocument({ resume }) {
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
          <h2 className="text-lg font-bold leading-tight truncate">{resume.fullName || "Ваше ім'я"}</h2>
          <p className="text-sm font-medium truncate" style={{ color: accent }}>
            {resume.role || "Посада"}
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
            Про мене
          </h3>
          <p className="text-[12px] leading-relaxed" style={{ color: theme.text, opacity: 0.85 }}>
            {resume.summary}
          </p>
        </section>
      )}

      {resume.experience.length > 0 && (
        <section className="mb-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: accent }}>
            Досвід роботи
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
            Освіта
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
            Навички
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
            Портфоліо
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
  const [sendingViaBot, setSendingViaBot] = useState(false);
  const [sendResult, setSendResult] = useState(null); // "ok" | "error" | null
  const { t } = useLanguage();

  const shareUrl = buildShareLink(resume.id);

  const handleSendViaBot = async () => {
    setSendResult(null);
    setSendingViaBot(true);

    // Захист від "вічної загрузки": якщо генерація HTML або сам запит до
    // бекенду з якоїсь причини не завершаться — через 25с примусово
    // скидаємо стан і показуємо помилку, а не крутимо спінер нескінченно.
    const timeoutMs = 25000;
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      setSendingViaBot(false);
      setSendResult("error");
    }, timeoutMs);

    try {
      const { blob, fileName } = await generateResumeHtml(resume);
      const htmlBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
        reader.onerror = () => reject(reader.error || new Error("file_read_failed"));
        reader.readAsDataURL(blob);
      });
      const title = `${resume.fullName || "Резюме"}${resume.role ? " — " + resume.role : ""}`;

      await apiFetch("/api/resume-send", {
        method: "POST",
        body: { htmlBase64, fileName, shareUrl, title },
      });
      if (!timedOut) setSendResult("ok");
    } catch (err) {
      console.error("[Preview] send via bot failed", err);
      if (!timedOut) setSendResult("error");
    } finally {
      clearTimeout(timeoutId);
      if (!timedOut) setSendingViaBot(false);
    }
  };

  const handleShareLink = () => {
    const title = `${resume.fullName || "Резюме"}${resume.role ? " — " + resume.role : ""}`;
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

  return (
    <div className="flex-1 flex flex-col bg-base-950">
      <div className="print:hidden">
        <div className="px-6 pt-2 pb-4 flex items-center gap-3">
          <button onClick={onBack} className="tap w-8 h-8 flex items-center justify-center text-white/70">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 3L5 9l6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-lg font-bold flex-1">Попередній перегляд</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-4">
        <ResumeDocument resume={resume} />
      </div>

      {(resume.portfolio || []).length > 0 && (
        <p className="px-6 pb-2 text-[11px] text-white/35 print:hidden">
          Відео з портфоліо у файлі відкриваються за посиланням по кліку на обкладинку (потрібен інтернет).
        </p>
      )}

      {!backendEnabled && (
        <p className="px-6 pb-2 text-[11px] text-amber-400/70 print:hidden">
          Базу даних не підключено — посилання "Поділитись" відкриється лише у вашому браузері.
        </p>
      )}

      <div className="px-6 pb-3 print:hidden flex gap-3">
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
          Поділитися
        </button>
        <button
          onClick={onDone}
          className="tap flex-1 flex items-center justify-center gap-2 bg-base-850 border border-base-700 text-white/85 font-medium text-sm rounded-xl py-3.5"
        >
          {t("common.save")}
        </button>
      </div>

      <div className="px-6 pb-2 print:hidden">
        <button
          onClick={handleSendViaBot}
          disabled={sendingViaBot}
          className="tap w-full flex items-center justify-center gap-2 bg-base-850 border border-base-700 text-white/85 font-medium text-sm rounded-xl py-3.5 disabled:opacity-50"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path
              d="M21.5 3.5L2.7 11.1c-1.2.5-1.2 1.2-.2 1.5l4.8 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.2-2.1 4.6 3.4c.8.5 1.4.2 1.6-.8l3-14c.3-1.2-.5-1.7-1.3-1.4z"
              fill="currentColor"
            />
          </svg>
          {sendingViaBot ? t("share.sendingViaBot") : t("share.sendViaBot")}
        </button>
      </div>

      <p className="px-6 pb-2 text-[11px] text-white/35 print:hidden">
        {t("share.sendViaBotHint")}
      </p>

      {sendResult === "ok" && (
        <p className="px-6 pb-4 text-[11px] text-emerald-400 print:hidden">{t("share.sendViaBotSuccess")}</p>
      )}
      {sendResult === "error" && (
        <p className="px-6 pb-4 text-[11px] text-red-400 print:hidden">
          {t("share.sendViaBotFailed")}{" "}
          <a
            href={`https://t.me/${TELEGRAM_BOT_USERNAME}`}
            onClick={(e) => {
              e.preventDefault();
              openTelegramLinkSafe(`https://t.me/${TELEGRAM_BOT_USERNAME}`);
            }}
            className="text-accent-300 underline"
          >
            @{TELEGRAM_BOT_USERNAME}
          </a>
        </p>
      )}
    </div>
  );
}

function openTelegramLinkSafe(url) {
  const tg = getTelegramWebApp();
  if (tg?.openTelegramLink) tg.openTelegramLink(url);
  else if (tg?.openLink) tg.openLink(url);
  else window.open(url, "_blank");
}
