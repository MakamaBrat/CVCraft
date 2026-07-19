import { useState } from "react";
import StatusBar from "../components/StatusBar.jsx";

const CATEGORIES = ["Всі", "Мінімал", "Сучасні", "Креативні"];

const TEMPLATES = [
  { id: "minimal", name: "Мінімал", cat: "Мінімал", accent: "#9aa0a6" },
  { id: "modern", name: "Сучасний", cat: "Сучасні", accent: "#6c5ce7" },
  { id: "bold", name: "Виразний", cat: "Креативні", accent: "#ff7a59" },
  { id: "classic", name: "Класичний", cat: "Мінімал", accent: "#4c9be8" },
];

function MiniCard({ tpl, resume, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`tap relative rounded-2xl overflow-hidden bg-white text-black text-left p-3 aspect-[3/4] border-2 ${
        selected ? "border-violet-500" : "border-transparent"
      }`}
    >
      {selected && (
        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center z-10">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5l2.5 2.5L8.5 2" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-5 h-5 rounded-full shrink-0" style={{ background: tpl.accent }} />
        <div className="min-w-0">
          <p className="text-[9px] font-semibold truncate">{resume.fullName || "Іван Петренко"}</p>
          <p className="text-[7px] text-black/50 truncate">{resume.role || "Unity Developer"}</p>
        </div>
      </div>
      <div className="space-y-1">
        <div className="h-1 rounded-full bg-black/10 w-full" />
        <div className="h-1 rounded-full bg-black/10 w-4/5" />
        <div className="h-1 rounded-full bg-black/10 w-full mt-2" style={{ background: tpl.accent, opacity: 0.5 }} />
        <div className="h-1 rounded-full bg-black/10 w-3/5" />
        <div className="h-1 rounded-full bg-black/10 w-full" />
      </div>
    </button>
  );
}

export default function Templates({ draft, setDraft, onBack, onNext }) {
  const [cat, setCat] = useState("Всі");
  const visible = cat === "Всі" ? TEMPLATES : TEMPLATES.filter((t) => t.cat === cat);

  return (
    <div className="flex-1 flex flex-col bg-base-950">
      <StatusBar />

      <div className="px-6 pt-2 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="tap w-8 h-8 flex items-center justify-center text-white/70">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 3L5 9l6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-bold">Оберіть шаблон</h1>
      </div>

      <div className="px-6 pb-4 flex gap-2 overflow-x-auto">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`tap shrink-0 text-xs font-medium rounded-full px-3.5 py-1.5 border ${
              cat === c
                ? "bg-violet-500 border-violet-500 text-white"
                : "border-base-700 text-white/60"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-4">
        <div className="grid grid-cols-2 gap-3">
          {visible.map((tpl) => (
            <MiniCard
              key={tpl.id}
              tpl={tpl}
              resume={draft}
              selected={draft.template === tpl.id}
              onClick={() => setDraft({ ...draft, template: tpl.id })}
            />
          ))}
        </div>
      </div>

      <div className="px-6 pb-6 pt-2">
        <button
          onClick={onNext}
          className="tap w-full flex items-center justify-center gap-2 bg-violet-500 text-white font-semibold text-sm rounded-xl py-3.5"
        >
          Переглянути резюме
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
