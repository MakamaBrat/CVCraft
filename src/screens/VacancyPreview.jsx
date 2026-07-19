import StatusBar from "../components/StatusBar.jsx";
import ShareButtons from "../components/ShareButtons.jsx";
import { MediaPreview } from "./Wizard.jsx";
import { buildVacancyShareLink } from "../lib/config.js";
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
        <section className="print:hidden">
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

export default function VacancyPreview({ vacancy, onBack, onSendToModeration, onSave }) {
  const { t } = useLanguage();
  const shareUrl = buildVacancyShareLink(vacancy.id);
  const status = vacancy.status || VACANCY_STATUS.DRAFT;

  return (
    <div className="flex-1 flex flex-col bg-base-950">
      <div className="print:hidden">
        <StatusBar />
        <div className="px-6 pt-2 pb-4 flex items-center gap-3">
          <button onClick={onBack} className="tap w-8 h-8 flex items-center justify-center text-white/70">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 3L5 9l6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-lg font-bold">{t("vacancy.title")}</h1>
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

      <div className="px-6 pb-3 pt-2 flex gap-3 print:hidden">
        <button
          onClick={onSave}
          className="tap flex-1 flex items-center justify-center gap-2 bg-base-800 border border-base-700 text-white font-semibold text-sm rounded-xl py-3.5"
        >
          {t("common.save")}
        </button>
        {(status === VACANCY_STATUS.DRAFT || status === VACANCY_STATUS.REJECTED) && (
          <button
            onClick={onSendToModeration}
            className="tap flex-1 flex items-center justify-center gap-2 bg-accent-500 text-base-950 font-semibold text-sm rounded-xl py-3.5"
          >
            {t("vacancy.sendToModeration")}
          </button>
        )}
      </div>

      <ShareButtons shareUrl={shareUrl} shareText={`${vacancy.position || ""} — ${vacancy.company || ""}`.trim()} />
    </div>
  );
}
