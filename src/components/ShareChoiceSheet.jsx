import { useLanguage } from "../lib/i18n/index.jsx";

// Уточнююче меню для кнопки "Поділитися": користувач обирає, надіслати
// посилання собі в бота в ЛС ("У бот", сценарій sendMessage через бекенд)
// чи одразу відкрити стандартне вікно пересилання Telegram
// (t.me/share/url, варіант "Поділитися").
export default function ShareChoiceSheet({ open, sharing = false, onClose, onChooseBot, onChooseShare }) {
  const { t } = useLanguage();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-[420px] bg-base-900 border-t border-base-700 rounded-t-2xl px-5 pt-4 pb-6 fade-up">
        <div className="w-9 h-1 rounded-full bg-white/15 mx-auto mb-4" />
        <div className="flex flex-col gap-2">
          <button
            onClick={onChooseBot}
            disabled={sharing}
            className="tap w-full flex items-center gap-3 bg-base-850 border border-base-700 rounded-xl px-4 py-3 text-left text-sm font-medium text-white/90 disabled:opacity-60"
          >
            <span className="text-base leading-none">🤖</span>
            {sharing ? t("share.sending") : t("share.toBot")}
          </button>
          <button
            onClick={onChooseShare}
            disabled={sharing}
            className="tap w-full flex items-center gap-3 bg-base-850 border border-base-700 rounded-xl px-4 py-3 text-left text-sm font-medium text-white/90 disabled:opacity-60"
          >
            <span className="text-base leading-none">🔗</span>
            {t("common.share")}
          </button>
        </div>

        <button onClick={onClose} className="tap w-full mt-3 text-center text-sm font-medium text-white/50 py-2">
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}
