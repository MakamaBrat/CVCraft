import { useEffect, useState } from "react";
import { registerConfirmHost } from "../lib/confirmStore.js";
import { useLanguage } from "../lib/i18n/index.jsx";

// Рендериться один раз у корені застосунку (App.jsx). Поки жодного запиту
// на підтвердження нема — нічого не малює. Коли confirmDialog() (поза
// Telegram) кличе requestInAppConfirm(message), тут з'являється bottom
// sheet з двома кнопками; вибір користувача резолвить проміс, на який
// чекає викликач.
export default function ConfirmModal() {
  const { t } = useLanguage();
  const [pending, setPending] = useState(null); // { message, resolve }

  useEffect(() => {
    return registerConfirmHost(
      (message) =>
        new Promise((resolve) => {
          setPending({ message, resolve });
        })
    );
  }, []);

  if (!pending) return null;

  const finish = (value) => {
    pending.resolve(value);
    setPending(null);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={() => finish(false)} />
      <div className="relative w-full max-w-[420px] bg-base-900 border-t border-base-700 rounded-t-2xl px-5 pt-4 pb-6 fade-up">
        <div className="w-9 h-1 rounded-full bg-white/15 mx-auto mb-4" />
        <p className="text-sm text-white/85 leading-relaxed mb-5 whitespace-pre-line">{pending.message}</p>
        <div className="flex gap-3">
          <button
            onClick={() => finish(false)}
            className="tap flex-1 text-center text-sm font-medium text-white/70 bg-base-850 border border-base-700 rounded-xl py-3"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={() => finish(true)}
            className="tap flex-1 text-center text-sm font-semibold text-base-950 bg-accent-500 rounded-xl py-3"
          >
            {t("common.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
