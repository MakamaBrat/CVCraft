import { useState } from "react";
import { apiFetch } from "../lib/api.js";
import { useLanguage } from "../lib/i18n/index.jsx";

const REASONS = ["spam", "scam", "inappropriate", "fake", "offensive", "other"];

// Універсальна модалка скарги. targetType: 'vacancy' | 'applicant'.
// Для 'vacancy' треба vacancyId, для 'applicant' — applicationId.
export default function ReportModal({ targetType, vacancyId, applicationId, onClose, onSubmitted }) {
  const { t } = useLanguage();
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!reason) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/report", {
        method: "POST",
        body: {
          type: targetType,
          vacancyId: targetType === "vacancy" ? vacancyId : undefined,
          applicationId: targetType === "applicant" ? applicationId : undefined,
          reason,
          comment: comment.trim() || undefined,
        },
      });
      setDone(true);
      onSubmitted?.();
    } catch (err) {
      const code = err?.payload?.error;
      if (code === "cannot_report_own") setError(t("report.cannotReportOwn"));
      else setError(t("report.submitFailed"));
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-[420px] bg-base-900 border-t border-base-700 rounded-t-2xl px-5 pt-4 pb-6 fade-up">
        <div className="w-9 h-1 rounded-full bg-white/15 mx-auto mb-4" />

        {done ? (
          <div className="text-center py-4">
            <p className="text-sm font-medium text-emerald-300 mb-4">{t("report.thanks")}</p>
            <button
              onClick={onClose}
              className="tap w-full bg-base-800 border border-base-700 text-white/80 text-sm font-semibold rounded-xl py-3"
            >
              {t("common.close")}
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-white/90 mb-3">
              {targetType === "vacancy" ? t("report.titleVacancy") : t("report.titleApplicant")}
            </p>

            <div className="flex flex-col gap-2 mb-3">
              {REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`tap text-left rounded-xl px-4 py-2.5 border text-sm ${
                    reason === r ? "border-red-500 bg-red-500/10 text-red-300" : "border-base-700 bg-base-850 text-white/80"
                  }`}
                >
                  {t(`report.reasons.${r}`)}
                </button>
              ))}
            </div>

            <textarea
              className="w-full bg-base-850 border border-base-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-accent-500 min-h-[70px] resize-none mb-3"
              placeholder={t("report.commentPlaceholder")}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
            />

            {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

            <button
              onClick={submit}
              disabled={!reason || submitting}
              className="tap w-full bg-red-500/90 disabled:bg-base-700 disabled:text-white/30 text-white font-semibold text-sm rounded-xl py-3 mb-2"
            >
              {submitting ? t("common.loading") : t("report.submit")}
            </button>
            <button onClick={onClose} className="tap w-full text-center text-sm font-medium text-white/50 py-2">
              {t("common.cancel")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
