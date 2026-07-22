import { useState } from "react";
import { apiFetch } from "../lib/api.js";
import { useLanguage } from "../lib/i18n/index.jsx";

// Модалка підтвердження блокування. Взаємна: після блокування обидва
// користувачі перестають бачити контент один одного (вакансії/відгуки).
export default function BlockModal({ targetTelegramId, applicationId, targetName, onClose, onBlocked }) {
  const { t } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/block", {
        method: "POST",
        body: { action: "block", targetTelegramId, applicationId },
      });
      onBlocked?.();
    } catch (err) {
      setError(t("block.submitFailed"));
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-[420px] bg-base-900 border-t border-base-700 rounded-t-2xl px-5 pt-4 pb-6 fade-up">
        <div className="w-9 h-1 rounded-full bg-white/15 mx-auto mb-4" />

        <p className="text-sm font-semibold text-white/90 mb-2">{t("block.title")}</p>
        <p className="text-xs text-white/50 mb-4">
          {targetName ? t("block.descriptionNamed", { name: targetName }) : t("block.description")}
        </p>

        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

        <button
          onClick={submit}
          disabled={submitting}
          className="tap w-full bg-red-500/90 disabled:bg-base-700 disabled:text-white/30 text-white font-semibold text-sm rounded-xl py-3 mb-2"
        >
          {submitting ? t("common.loading") : t("block.confirm")}
        </button>
        <button onClick={onClose} className="tap w-full text-center text-sm font-medium text-white/50 py-2">
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}
