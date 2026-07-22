import { useEffect, useState } from "react";
import { MediaPreview } from "./Wizard.jsx";
import Avatar from "../components/Avatar.jsx";
import { buildVacancyShareLink } from "../lib/config.js";
import { generateVacancyPdf } from "../lib/pdf.js";
import { getTelegramWebApp } from "../lib/telegram.js";
import { apiFetch } from "../lib/api.js";
import { VACANCY_STATUS } from "../lib/vacancy.js";
import { useLanguage } from "../lib/i18n/index.jsx";
import { getColorTheme, getAlign, getDocBackgroundStyle } from "../lib/docTheme.js";

const ACCENTS = {
  minimal: "#4b5563",
  modern: "#6c5ce7",
  bold: "#ff7a59",
  classic: "#2f6fb0",
};

export function VacancyDocument({ vacancy }) {
  const { t } = useLanguage();
  const accent = ACCENTS[vacancy.template] || ACCENTS.minimal;
  const theme = getColorTheme(vacancy.colorScheme);
  const align = getAlign(vacancy.align);
  const isCenter = align === "center";
  return (
    <div
      id="vacancy-doc"
      className="rounded-xl shadow-xl mx-auto"
      style={{
        width: "100%",
        maxWidth: 400,
        padding: "28px 24px",
        fontFamily: "Manrope, sans-serif",
        ...getDocBackgroundStyle(theme, vacancy.backgroundUrl),
        color: theme.text,
        textAlign: align,
      }}
    >
      <div
        className={`flex gap-3 pb-4 mb-4 ${isCenter ? "flex-col items-center text-center" : "items-center"}`}
        style={{ borderBottom: `2px solid ${accent}` }}
      >
        <Avatar url={vacancy.avatarUrl} name={vacancy.company || vacancy.position} accent={accent} theme={theme} />
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-tight mb-1 truncate">{vacancy.position || t("vacancy.positionPlaceholder")}</h2>
          <p className="text-sm font-medium truncate" style={{ color: accent }}>
            {vacancy.company || t("vacancy.companyPlaceholder")}
          </p>
        </div>
      </div>

      <div
        className={`flex flex-wrap gap-x-4 gap-y-1 text-[11px] mb-4 ${isCenter ? "justify-center" : ""}`}
        style={{ color: theme.textMed }}
      >
        {vacancy.salary && <span>{vacancy.salary}</span>}
        {vacancy.city && <span>{vacancy.city}</span>}
        {vacancy.employmentType && <span>{vacancy.employmentType}</span>}
      </div>

      {vacancy.description && (
        <section className="mb-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: accent }}>
            {t("vacancy.description")}
          </h3>
          <p className="text-[12px] leading-relaxed whitespace-pre-line" style={{ color: theme.text, opacity: 0.85 }}>
            {vacancy.description}
          </p>
        </section>
      )}

      {vacancy.requirements && (
        <section className="mb-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: accent }}>
            {t("vacancy.requirements")}
          </h3>
          <p className="text-[12px] leading-relaxed whitespace-pre-line" style={{ color: theme.text, opacity: 0.85 }}>
            {vacancy.requirements}
          </p>
        </section>
      )}

      {vacancy.contact && (
        <section className="mb-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: accent }}>
            {t("vacancy.contact")}
          </h3>
          <p className="text-[12px]" style={{ color: theme.text, opacity: 0.85 }}>
            {vacancy.contact}
          </p>
        </section>
      )}

      {(vacancy.media || []).length > 0 && (
        <section>
          <h3 className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: accent }}>
            {t("vacancy.media")}
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

  // Ціни більше не беремо із замороженого значення в рядку вакансії —
  // тягнемо актуальні з /api/pricing (окрема таблиця pricing_settings у
  // Supabase), щоб зміна ціни в адмінці одразу відображалась тут.
  // listingPrice — ⭐ за 1 період (1 тиждень) звичайного розміщення,
  // topPrice — ⭐ за 1 період (1 тиждень) топ-розміщення (додатково).
  const [listingPrice, setListingPrice] = useState(500);
  const [topPrice, setTopPrice] = useState(5);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/pricing")
      .then((res) => {
        if (cancelled || !res) return;
        if (Number.isFinite(res.listingPrice)) setListingPrice(res.listingPrice);
        if (Number.isFinite(res.topPrice)) setTopPrice(res.topPrice);
      })
      .catch(() => {
        // залишаємось на значеннях за замовчуванням
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isExpired = vacancy.expiresAt ? new Date(vacancy.expiresAt).getTime() <= Date.now() : false;
  const isTop = vacancy.topUntil ? new Date(vacancy.topUntil).getTime() > Date.now() : false;

  const needsPayment = status === VACANCY_STATUS.APPROVED;
  const canExtend = status === VACANCY_STATUS.ACTIVE || status === VACANCY_STATUS.PAUSED;
  const canBuyTop = canExtend;

  const [periodsToBuy, setPeriodsToBuy] = useState(1);
  const [topPeriodsToBuy, setTopPeriodsToBuy] = useState(1);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(null);
  const [payingTop, setPayingTop] = useState(false);
  const [topPayError, setTopPayError] = useState(null);
  const totalStars = Math.max(0, periodsToBuy) * listingPrice;
  const totalTopStars = Math.max(0, topPeriodsToBuy) * topPrice;

  const openInvoice = (kind, weeks, onDone) => {
    return apiFetch("/api/vacancy-invoice", {
      method: "POST",
      body: { id: vacancy.id, kind, weeks },
    }).then((res) => {
      // Ціна 0 ⭐ — сервер одразу застосував продовження/активацію без
      // створення інвойсу Telegram, тут просто підтверджуємо "paid".
      if (res.free) {
        onDone("paid");
        return;
      }
      const tg = getTelegramWebApp();
      if (!tg?.openInvoice) {
        onDone("no_telegram");
        return;
      }
      tg.openInvoice(res.invoiceLink, (invoiceStatus) => onDone(invoiceStatus));
    });
  };

  const handlePay = async () => {
    if (periodsToBuy < 1) return;
    setPayError(null);
    setPaying(true);
    try {
      await openInvoice(needsPayment ? "listing" : "extend", periodsToBuy, async (invoiceStatus) => {
        setPaying(false);
        if (invoiceStatus === "paid") {
          await onPaid?.(vacancy.id);
        } else if (invoiceStatus === "failed") {
          setPayError(t("vacancy.payFailed"));
        } else if (invoiceStatus === "no_telegram") {
          setPayError(t("vacancy.payNoTelegram"));
        }
      });
    } catch (err) {
      console.error("[VacancyPreview] invoice failed", err);
      setPayError(t("vacancy.payCreateFailed"));
      setPaying(false);
    }
  };

  const handlePayTop = async () => {
    if (topPeriodsToBuy < 1) return;
    setTopPayError(null);
    setPayingTop(true);
    try {
      await openInvoice("top", topPeriodsToBuy, async (invoiceStatus) => {
        setPayingTop(false);
        if (invoiceStatus === "paid") {
          await onPaid?.(vacancy.id);
        } else if (invoiceStatus === "failed") {
          setTopPayError(t("vacancy.payFailed"));
        } else if (invoiceStatus === "no_telegram") {
          setTopPayError(t("vacancy.payNoTelegram"));
        }
      });
    } catch (err) {
      console.error("[VacancyPreview] top invoice failed", err);
      setTopPayError(t("vacancy.payCreateFailed"));
      setPayingTop(false);
    }
  };

  const handleShareLink = () => {
    const title = [vacancy.position, vacancy.company].filter(Boolean).join(" — ");
    // url — окремим параметром, Telegram сам покаже його клікабельною
    // карткою-прев'ю під текстом, дублювати посилання в text не треба.
    const text = `${t("share.vacancyClickHint")}\n\n${title}`;
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
      ({ blob, fileName } = await generateVacancyPdf(vacancy));
    } catch (err) {
      console.error("[VacancyPreview] pdf generation failed", err);
      setShareError(`${t("vacancy.shareFailed")} (${err?.message || "?"})`);
      setSharing(false);
      return;
    }

    const title = `${vacancy.position || t("vacancy.vacancyPlaceholder")}${vacancy.company ? " — " + vacancy.company : ""}`;
    // Тут файл (PDF) іде окремо від "url", тож Web Share API не завжди
    // будує з url клікабельну картку — лишаємо посилання явно в тексті,
    // але за локалізованою підказкою замість голого "Відкрийте застосунок…".
    const caption = [title, "", t("share.vacancyClickHint"), shareUrl].join("\n");

    // Web Share API з файлом. PDF уже готовий (blob), тож якщо сам крок
    // "поділитися" впаде (буває в деяких мобільних вебв'ю навіть коли
    // canShare сказав "можна") — не показуємо жорстку помилку, а падаємо
    // назад на завантаження файлу + відкриття Telegram-шерингу окремо.
    try {
      const file = new File([blob], fileName, { type: "application/pdf" });
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
      console.error("[VacancyPreview] navigator.share failed, falling back to download", err);
    }

    try {
      // Фолбек: качаємо PDF і одразу відкриваємо Telegram-шеринг. url іде
      // окремим параметром, тому в text лишаємо тільки локалізовану підказку.
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);

      const shareText = `${t("share.vacancyClickHint")}\n\n${title}`;
      const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
      const tg = getTelegramWebApp();
      if (tg?.openTelegramLink) tg.openTelegramLink(telegramShareUrl);
      else if (tg?.openLink) tg.openLink(telegramShareUrl);
      else window.open(telegramShareUrl, "_blank");
    } catch (err) {
      console.error("[VacancyPreview] download fallback failed", err);
      setShareError(`${t("vacancy.shareFailed")} (${err?.message || "?"})`);
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
            title={t("vacancy.pdfFileTitle")}
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
          {isTop && (
            <span className="inline-block ml-2 text-[11px] font-semibold rounded-full px-3 py-1 bg-accent-500/15 border border-accent-500/30 text-accent-300">
              {t("vacancy.topBadge")}
            </span>
          )}
          {(status === VACANCY_STATUS.ACTIVE || status === VACANCY_STATUS.PAUSED) && vacancy.expiresAt && (
            <p className="mt-2 text-xs text-white/45">
              {isExpired
                ? t("vacancy.expiredOn", new Date(vacancy.expiresAt).toLocaleDateString())
                : t("vacancy.activeUntil", new Date(vacancy.expiresAt).toLocaleDateString())}
            </p>
          )}
          {isTop && vacancy.topUntil && (
            <p className="mt-1 text-xs text-accent-300/80">
              {t("vacancy.topUntil", new Date(vacancy.topUntil).toLocaleDateString())}
            </p>
          )}
          {status === VACANCY_STATUS.REJECTED && vacancy.rejectReason && (
            <p className="mt-2 text-xs text-red-400/80">
              {t("vacancy.rejectedReason")}: {vacancy.rejectReason}
            </p>
          )}
        </div>
      )}

      {shareError && <p className="px-6 pb-2 text-[11px] text-red-400 print:hidden">{shareError}</p>}

      {(needsPayment || canExtend) && (
        <div className="px-6 pb-4 print:hidden">
          <div className="bg-base-850 border border-base-700 rounded-xl p-4">
            <p className="text-sm font-semibold text-white/90 mb-1">
              {needsPayment ? t("vacancy.payAndPublish") : t("vacancy.extendListing")}
            </p>
            <p className="text-xs text-white/45 mb-3">{t("vacancy.listingPricePerPeriod", listingPrice)}</p>

            <label className="block text-xs font-medium text-white/60 mb-1.5">{t("vacancy.choosePeriods")}</label>
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => setPeriodsToBuy((n) => Math.max(1, n - 1))}
                className="tap w-9 h-9 rounded-lg bg-base-900 border border-base-700 text-white/70 font-semibold"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                value={periodsToBuy}
                onChange={(e) => setPeriodsToBuy(Math.max(1, Number(e.target.value) || 1))}
                className="w-20 text-center bg-base-900 border border-base-700 rounded-lg py-2 text-sm text-white outline-none focus:border-accent-500"
              />
              <button
                onClick={() => setPeriodsToBuy((n) => n + 1)}
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
              {paying ? t("vacancy.openingPayment") : `${needsPayment ? t("vacancy.payAndPublish") : t("vacancy.extendListing")} · ${t("vacancy.totalPrice", totalStars)}`}
            </button>
          </div>
        </div>
      )}

      {canBuyTop && (
        <div className="px-6 pb-4 print:hidden">
          <div className="bg-base-850 border border-base-700 rounded-xl p-4">
            <p className="text-sm font-semibold text-white/90 mb-1">{t("vacancy.buyTop")}</p>
            <p className="text-xs text-white/45 mb-3">{t("vacancy.topPricePerPeriod", topPrice)}</p>

            <label className="block text-xs font-medium text-white/60 mb-1.5">{t("vacancy.choosePeriods")}</label>
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => setTopPeriodsToBuy((n) => Math.max(1, n - 1))}
                className="tap w-9 h-9 rounded-lg bg-base-900 border border-base-700 text-white/70 font-semibold"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                value={topPeriodsToBuy}
                onChange={(e) => setTopPeriodsToBuy(Math.max(1, Number(e.target.value) || 1))}
                className="w-20 text-center bg-base-900 border border-base-700 rounded-lg py-2 text-sm text-white outline-none focus:border-accent-500"
              />
              <button
                onClick={() => setTopPeriodsToBuy((n) => n + 1)}
                className="tap w-9 h-9 rounded-lg bg-base-900 border border-base-700 text-white/70 font-semibold"
              >
                +
              </button>
            </div>

            {topPayError && <p className="text-[11px] text-red-400 mb-2">{topPayError}</p>}

            <button
              onClick={handlePayTop}
              disabled={payingTop}
              className="tap w-full flex items-center justify-center gap-2 bg-accent-500/90 text-base-950 font-semibold text-sm rounded-xl py-3 disabled:opacity-60"
            >
              {payingTop ? t("vacancy.openingPayment") : `${t("vacancy.buyTop")} · ${t("vacancy.totalPrice", totalTopStars)}`}
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
          {t("vacancy.share")}
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
