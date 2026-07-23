import { useState } from "react";
import { fetchRandomGifUrl } from "../lib/giphy.js";

// Іконка-кубик (dice) — натискання тягне випадкову гіфку з Giphy і одразу
// підставляє її посилання в поле. Використовується і для аватара/лого,
// і для фону — і в резюме (Templates.jsx), і у вакансії (VacancyTemplates.jsx).
function DiceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="12" height="12" rx="3" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="5.3" cy="5.3" r="1" fill="currentColor" />
      <circle cx="10.7" cy="5.3" r="1" fill="currentColor" />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
      <circle cx="5.3" cy="10.7" r="1" fill="currentColor" />
      <circle cx="10.7" cy="10.7" r="1" fill="currentColor" />
    </svg>
  );
}

export default function GifUrlField({ value, onChange, placeholder, tag, diceLabel, errorLabel }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const rollRandom = async () => {
    setLoading(true);
    setError(false);
    try {
      const url = await fetchRandomGifUrl(tag);
      onChange(url);
    } catch {
      setError(true);
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="flex gap-2">
        <input
          className="flex-1 min-w-0 bg-base-850 border border-base-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-accent-500"
          placeholder={placeholder}
          value={value || ""}
          onChange={(e) => {
            setError(false);
            onChange(e.target.value.trim());
          }}
        />
        <button
          type="button"
          onClick={rollRandom}
          disabled={loading}
          title={diceLabel}
          aria-label={diceLabel}
          className="tap shrink-0 w-11 h-11 rounded-xl bg-base-850 border border-base-700 flex items-center justify-center text-white/70 disabled:opacity-50"
        >
          {loading ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="animate-spin">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.6" strokeOpacity="0.25" />
              <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          ) : (
            <DiceIcon />
          )}
        </button>
      </div>

      {error && <p className="text-xs text-red-400 mt-1.5">{errorLabel}</p>}

      {value && (
        <div className="mt-2 w-16 h-16 rounded-lg overflow-hidden bg-base-850 border border-base-700">
          <img src={value} alt="" className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );
}
