import StatusBar from "../components/StatusBar.jsx";

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Оновлено щойно";
  if (min < 60) return `Оновлено ${min} хв тому`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `Оновлено ${hrs} год тому`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Оновлено вчора";
  return `Оновлено ${days} дн тому`;
}

const initials = (name) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

export default function Home({ resumes, onCreate, onEdit, onDelete }) {
  return (
    <div className="flex-1 flex flex-col bg-base-950">
      <StatusBar />

      <div className="px-6 pt-2 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-500 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 3h10v2H2zM2 6h10v2H2zM2 9h7v2H2z" fill="white" />
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight">CVCraft</span>
          <span className="text-[10px] font-bold text-violet-300 bg-violet-500/20 rounded px-1.5 py-0.5">
            PRO
          </span>
        </div>
        <button className="tap w-8 h-8 rounded-full flex items-center justify-center bg-base-800/70 text-white/70">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 1.5a1.2 1.2 0 011.2 1v.4a5.1 5.1 0 011.5.6l.3-.3a1.2 1.2 0 011.7 1.7l-.3.3c.3.5.5 1 .6 1.5h.4a1.2 1.2 0 010 2.4h-.4a5.1 5.1 0 01-.6 1.5l.3.3a1.2 1.2 0 01-1.7 1.7l-.3-.3a5.1 5.1 0 01-1.5.6v.4a1.2 1.2 0 01-2.4 0v-.4a5.1 5.1 0 01-1.5-.6l-.3.3a1.2 1.2 0 01-1.7-1.7l.3-.3a5.1 5.1 0 01-.6-1.5h-.4a1.2 1.2 0 010-2.4h.4c.1-.5.3-1 .6-1.5l-.3-.3a1.2 1.2 0 011.7-1.7l.3.3c.5-.3 1-.5 1.5-.6v-.4A1.2 1.2 0 018 1.5zM8 6a2 2 0 100 4 2 2 0 000-4z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>

      <div className="px-6 pb-6">
        <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-violet-500/70 p-5 shadow-glow relative overflow-hidden">
          <div className="absolute -right-6 -top-8 w-28 h-28 rounded-full bg-white/10 blur-2xl" />
          <h1 className="text-xl font-bold leading-snug mb-1.5 relative">
            Створіть резюме,
            <br />
            яке захочуть прочитати
          </h1>
          <p className="text-sm text-white/75 mb-4 relative">
            Професійне резюме за кілька хвилин з допомогою AI
          </p>
          <button
            onClick={onCreate}
            className="tap relative flex items-center justify-center gap-2 w-full bg-white text-violet-700 font-semibold text-sm rounded-xl py-3 hover:bg-white/90"
          >
            <span className="text-lg leading-none">+</span> Створити резюме
          </button>
        </div>
      </div>

      <div className="px-6 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-[15px] text-white/90">Мої резюме</h2>
          {resumes.length > 0 && (
            <span className="text-xs text-violet-300 font-medium">Всі</span>
          )}
        </div>

        {resumes.length === 0 ? (
          <div className="fade-up flex-1 flex flex-col items-center justify-center text-center pb-16 gap-2">
            <div className="w-14 h-14 rounded-2xl bg-base-800 flex items-center justify-center mb-1">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M6 3h9l4 4v14H6z" stroke="#8b7fff" strokeWidth="1.5" />
                <path d="M9 12h6M9 15h6M9 9h3" stroke="#8b7fff" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm text-white/50 max-w-[220px]">
              Резюме поки немає. Створіть перше — це займе кілька хвилин.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 overflow-y-auto pb-4">
            {resumes.map((r) => (
              <button
                key={r.id}
                onClick={() => onEdit(r.id)}
                className="tap group flex items-center gap-3 bg-base-850 border border-base-700 rounded-xl px-3.5 py-3 text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-violet-500/20 text-violet-300 font-semibold text-sm flex items-center justify-center shrink-0">
                  {initials(r.fullName || "Нове резюме")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">
                    {r.role || "Без назви посади"}
                  </p>
                  <p className="text-xs text-white/45">{timeAgo(r.updatedAt)}</p>
                </div>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(r.id);
                  }}
                  className="tap opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 text-xs px-2 py-1"
                >
                  Видалити
                </span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white/25 shrink-0">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      <nav className="mt-auto grid grid-cols-3 border-t border-base-800 bg-base-900/80 backdrop-blur px-4 py-2.5">
        {[
          { label: "Головна", active: true },
          { label: "Шаблони", active: false },
          { label: "Профіль", active: false },
        ].map((n) => (
          <div key={n.label} className="flex flex-col items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${n.active ? "bg-violet-400" : "bg-transparent"}`} />
            <span className={`text-[11px] ${n.active ? "text-violet-300 font-medium" : "text-white/40"}`}>
              {n.label}
            </span>
          </div>
        ))}
      </nav>
    </div>
  );
}
