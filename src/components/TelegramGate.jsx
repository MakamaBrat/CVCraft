import { useLanguage } from "../lib/i18n/index.jsx";
import { TELEGRAM_BOT_USERNAME, TELEGRAM_MINI_APP_NAME } from "../lib/config.js";

// РАНІШЕ цей екран дозволяв вручну ввести Telegram ID і продовжити роботу
// прямо в браузері — це був навмисний "чорний хід" для розробки/дебагу поза
// Telegram. Він же дозволяв будь-кому відкрити застосунок як звичайний сайт.
// Тепер жодного вводу немає: якщо Telegram WebView не виявлено — показуємо
// лише посилання, яке відкриває цей самий застосунок усередині Telegram.
export default function TelegramGate() {
  const { t } = useLanguage();
  const openInTelegram = `https://t.me/${TELEGRAM_BOT_USERNAME}/${TELEGRAM_MINI_APP_NAME}`;

  return (
    <div className="flex-1 flex flex-col bg-base-950">
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center fade-up">
        <div className="w-12 h-12 rounded-2xl bg-accent-500 flex items-center justify-center mb-5">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path
              d="M20 2L2 9.5l6 2.2M20 2l-3.5 17-6-4.8M20 2L9.7 12.9m0 0L8 20l2.3-3.7"
              stroke="black"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold mb-1.5">{t("gate.title")}</h1>
        <p className="text-sm text-white/50 mb-6 max-w-[280px]">{t("gate.subtitle")}</p>

        <a
          href={openInTelegram}
          className="tap w-full flex items-center justify-center gap-2 bg-accent-500 text-base-950 font-semibold text-sm rounded-xl py-3.5"
        >
          {t("gate.openInTelegram")}
        </a>
        <p className="text-xs text-white/35 mt-3">t.me/{TELEGRAM_BOT_USERNAME}</p>
      </div>
    </div>
  );
}
