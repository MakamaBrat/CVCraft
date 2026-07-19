import { useState } from "react";
import { MediaPreview } from "./Wizard.jsx";
import { buildVacancyShareLink } from "../lib/config.js";
import { generateVacancyPdf } from "../lib/pdf.js";
import { getTelegramWebApp } from "../lib/telegram.js";
import { apiFetch } from "../lib/api.js";
import { VACANCY_STATUS } from "../lib/vacancy.js";
import { useLanguage } from "../lib/i18n/index.jsx";

const ACCENTS = {
  minimal: "#4b5563",
  modern: "#6c5ce7",
  bold: "#ff7a59",
  classic: "#2f6fb0",
};

function VacancyDocument({ vacancy }) {
  const accent = ACCENTS[vacancy.template] || ACCENTS.minimal;
  return (
    <div
      id="vacancy-doc"
      className="bg-white text-[#1c1c1c] rounded-xl shadow-xl mx-auto"
      style={{ width: "100%", maxWidth: 400, padding: "28px 24px", fontFamily: "Manrope, sans-serif" }}
    >
      <div className="pb-4 mb-4" style={{ borderBottom: `2px solid ${accent}` }}>
        <h2 className="text-lg font-bold leading-tight mb-1">{vacancy.position || "Посада"}</h2>
        <p className="text-sm font-medium" style={{ color: accent }}>
          {vacancy.company || "Компанія"}
        </p>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-black/60 mb-4">
        {vacancy.salary && <span>{vacancy.salary}</span>}
        {vacancy.city && <span>{vacancy.city}</span>}
        {vacancy.employmentType && <span>{vacancy.employmentType}</span>}
      </div>

      {vacancy.description && (
        <section className="mb-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: accent }}>
            Опис
          </h3>
          <p className="text-[12px] leading-relaxed text-black/80 whitespace-pre-line">{vacancy.description}</p>
        </section>
      )}

      {vacancy.requirements && (
        <section className="mb-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: accent }}>
            Вимоги
          </h3>
          <p className="text-[12px] leading-relaxed text-black/80 whitespace-pre-line">{vacancy.requirements}</p>
        </section>
      )}

      {vacancy.contact && (
        <section className="mb-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: accent }}>
            Контакт
          </h3>
          <p className="text-[12px] text-black/80">{vacancy.contact}</p>
        </section>
      )}

      {(vacancy.media || []).length > 0 && (
        <section className="print:hidden" data-pdf-hide="true">
          <h3 className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: accent }}>
            Медіа
          </h3>
          <div className="space-y-3">
            {vacancy.media.map((p) => (
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

export default function VacancyPreview({ vacancy, onBack, onSendToModeration, onSave, onPaid }) {
  const { t } = useLanguage();
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState(null);
  const shareUrl = buildVacancyShareLink(vacancy.id);
  const status = vacancy.status || VACANCY_STATUS.DRAFT;

  const listingPrice = vacancy.listingPrice || 500;
  const perShow = vacancy.pricePerShow || 1;
  const needsPayment = status === VACANCY_STATUS.APPROVED;
  const canBuyMore = status === VACANCY_STATUS.ACTIVE || status === VACANCY_STATUS.PAUSED;

  const [showsToBuy, setShowsToBuy] = useState(20);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(null);
  const totalStars = (needsPayment ? listingPrice : 0) + Math.max(0, showsToBuy) * perShow;

  const handlePay = async () => {
    if (showsToBuy < 1) return;
    setPayError(null);
    setPaying(true);
    try {
      const res = await apiFetch("/api/vacancy-invoice", {
        method: "POST",
        body: { id: vacancy.id, kind: needsPayment ? "listing" : "extra_shows", shows: showsToBuy },
      });
      const tg = getTelegramWebApp();
      if (!tg?.openInvoice) {
        setPayError("Оплата доступна лише в застосунку Telegram.");
        setPaying(false);
        return;
      }
      tg.openInvoice(res.invoiceLink, async (invoiceStatus) => {
        setPaying(false);
        if (invoiceStatus === "paid") {
          await onPaid?.(vacancy.id);
        } else if (invoiceStatus === "failed") {
          setPayError("Оплата не пройшла. Спробуйте ще раз.");
        }
      });
    } catch (err) {
      console.error("[VacancyPreview] invoice failed", err);
      setPayError("Не вдалося створити рахунок. Спробуйте ще раз.");
      setPaying(false);
    }
  };

  const handleShareLink = () => {
    const text = [vacancy.position, vacancy.company].filter(Boolean).join(" — ");
    const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
    const tg = getTelegramWebApp();
    if (tg?.openTelegramLink) tg.openTelegramLink(telegramShareUrl);
    else if (tg?.openLink) tg.openLink(telegramShareUrl);
    else window.open(telegramShareUrl, "_blank");
  };

  const handleShare = async () => {
    setShareError(null);
    setSharing(true);
    try {
      const { blob, fileName } = await generateVacancyPdf(vacancy);
      const file = new File([blob], fileName, { type: "application/pdf" });
      const caption = [
        `${vacancy.position || "Вакансія"}${vacancy.company ? " — " + vacancy.company : ""}`,
        "",
        `Відкрийте через застосунок CV DECK, щоб працювали всі вкладені файли: ${shareUrl}`,
      ].join("\n");

      // Web Share API з файлом — одна дія одразу шерить і PDF, і посилання
      // з підписом (підтримується мобільними браузерами й Telegram
      // in-app browser на iOS/Android).
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: caption, title: fileName });
        return;
      }

      // Фолбек, якщо файловий шеринг недоступний (напр. десктоп): качаємо
      // PDF і одразу відкриваємо Telegram-шеринг з посиланням і підписом.
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);

      const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(caption)}`;
      const tg = getTelegramWebApp();
      if (tg?.openTelegramLink) tg.openTelegramLink(telegramShareUrl);
      else if (tg?.openLink) tg.openLink(telegramShareUrl);
      else window.open(telegramShareUrl, "_blank");
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("[VacancyPreview] share failed", err);
        setShareError("Не вдалося поділитися вакансією. Спробуйте ще раз.");
      }
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
          <h1 className="text-lg font-bold flex-1">{t("vacancy.title")}</h1>
          <button
            onClick={handleShare}
            disabled={sharing}
            title="PDF + посилання"
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
        <VacancyDocument vacancy={vacancy} />
      </div>

      {status !== VACANCY_STATUS.DRAFT && (
        <div className="px-6 pb-2 print:hidden">
          <span className="inline-block text-[11px] font-semibold rounded-full px-3 py-1 bg-base-850 border border-base-700 text-white/70">
            {t(`vacancy.status.${status}`)}
          </span>
          {status === VACANCY_STATUS.REJECTED && vacancy.rejectReason && (
            <p className="mt-2 text-xs text-red-400/80">
              {t("vacancy.rejectedReason")}: {vacancy.rejectReason}
            </p>
          )}
        </div>
      )}

      {shareError && <p className="px-6 pb-2 text-[11px] text-red-400 print:hidden">{shareError}</p>}

      {(needsPayment || canBuyMore) && (
        <div className="px-6 pb-4 print:hidden">
          <div className="bg-base-850 border border-base-700 rounded-xl p-4">
            <p className="text-sm font-semibold text-white/90 mb-1">
              {needsPayment ? t("vacancy.payAndPublish") : t("vacancy.buyMoreShows")}
            </p>
            {needsPayment && (
              <p className="text-xs text-white/45 mb-2">{t("vacancy.listingPrice", listingPrice)}</p>
            )}
            <p className="text-xs text-white/45 mb-3">{t("vacancy.perShowPrice", perShow)}</p>

            <label className="block text-xs font-medium text-white/60 mb-1.5">{t("vacancy.chooseShows")}</label>
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => setShowsToBuy((n) => Math.max(1, n - 10))}
                className="tap w-9 h-9 rounded-lg bg-base-900 border border-base-700 text-white/70 font-semibold"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                value={showsToBuy}
                onChange={(e) => setShowsToBuy(Math.max(1, Number(e.target.value) || 1))}
                className="w-20 text-center bg-base-900 border border-base-700 rounded-lg py-2 text-sm text-white outline-none focus:border-accent-500"
              />
              <button
                onClick={() => setShowsToBuy((n) => n + 10)}
                className="tap w-9 h-9 rounded-lg bg-base-900 border border-base-700 text-white/70 font-semibold"
              >
                +
              </button>
            </div>

            {payError && <p className="text-[11px] text-red-400 mb-2">{payError}</p>}

            <button
              onClick={handlePay}
              disabled={paying}
              className="tap w-full flex items-center justify-center gap-2 bg-accent-500 text-base-950 font-semibold text-sm rounded-xl py-3 disabled:opacity-60"
            >
              {paying ? "Відкриваємо оплату…" : `${needsPayment ? t("vacancy.payAndPublish") : t("vacancy.buyMoreShows")} · ${t("vacancy.totalPrice", totalStars)}`}
            </button>
          </div>
        </div>
      )}

      <div className="px-6 pb-3 pt-0 flex gap-3 print:hidden">
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
          onClick={onSave}
          className="tap flex-1 flex items-center justify-center gap-2 bg-base-800 border border-base-700 text-white font-semibold text-sm rounded-xl py-3.5"
        >
          {t("common.save")}
        </button>
      </div>

      {(status === VACANCY_STATUS.DRAFT || status === VACANCY_STATUS.REJECTED) && (
        <div className="px-6 pb-6 print:hidden">
          <button
            onClick={onSendToModeration}
            className="tap w-full flex items-center justify-center gap-2 bg-base-850 border border-base-700 text-white/85 font-semibold text-sm rounded-xl py-3.5"
          >
            {t("vacancy.sendToModeration")}
          </button>
        </div>
      )}
    </div>
  );
}
