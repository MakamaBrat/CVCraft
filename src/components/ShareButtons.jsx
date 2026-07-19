import { getTelegramWebApp } from "../lib/telegram.js";
import { useLanguage } from "../lib/i18n/index.jsx";

// Кнопка "Поділитися через застосунок" відкриває нативне вікно шерингу
// Telegram (t.me/share/url), яке коректно передає посилання разом з
// прев'ю (гіфки/відео підтягуються з og:тегів сторінки, якщо вони є).
// Кнопка "Завантажити PDF" викликає системний друк — той самий підхід,
// що вже використовувався для резюме.
export default function ShareButtons({ shareUrl, shareText }) {
  const { t } = useLanguage();

  const handleShareViaApp = () => {
    const tg = getTelegramWebApp();
    const text = shareText || "";
    const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(telegramShareUrl);
    } else if (tg?.openLink) {
      tg.openLink(telegramShareUrl);
    } else {
      window.open(telegramShareUrl, "_blank");
    }
  };

  const handlePdf = () => window.print();

  return (
    <div className="px-6 pb-6 pt-2 flex gap-3 print:hidden">
      <button
        onClick={handleShareViaApp}
        className="tap flex-1 flex items-center justify-center gap-2 bg-accent-500 text-base-950 font-semibold text-sm rounded-xl py-3.5"
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <circle cx="11.5" cy="3.5" r="2" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="3.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="11.5" cy="11.5" r="2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5.3 6.5L9.7 4.3M5.3 8.5l4.4 2.2" stroke="currentColor" strokeWidth="1.3" />
        </svg>
        {t("share.shareApp")}
      </button>
      <button
        onClick={handlePdf}
        className="tap flex-1 flex items-center justify-center gap-2 bg-base-800 border border-base-700 text-white font-semibold text-sm rounded-xl py-3.5"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M4 2h8v3H4zM3 6h10a1 1 0 011 1v4a1 1 0 01-1 1h-1v2H4v-2H3a1 1 0 01-1-1V7a1 1 0 011-1z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
        {t("share.downloadPdf")}
      </button>
    </div>
  );
}
