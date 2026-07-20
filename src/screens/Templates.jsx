import { useState } from "react";
import { COLOR_THEMES, ALIGNMENTS, DEFAULT_COLOR_THEME } from "../lib/docTheme.js";

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
        selected ? "border-accent-500" : "border-transparent"
      }`}
    >
      {selected && (
        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-accent-500 flex items-center justify-center z-10">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5l2.5 2.5L8.5 2" stroke="black" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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

function ThemeCard({ theme, selected, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`tap rounded-xl overflow-hidden border-2 p-3 text-left ${
        selected ? "border-accent-500" : "border-base-700"
      }`}
      style={{ background: theme.bg }}
    >
      <p className="text-[10px] font-semibold mb-2" style={{ color: theme.text }}>
        Aa
      </p>
      <div className="space-y-1">
        <div className="h-1 rounded-full w-full" style={{ background: theme.text, opacity: 0.6 }} />
        <div className="h-1 rounded-full w-2/3" style={{ background: theme.text, opacity: 0.35 }} />
      </div>
      <p className="mt-2 text-[9px] font-medium" style={{ color: theme.text }}>
        {label}
      </p>
    </button>
  );
}

function AlignOption({ align, selected, onClick, label }) {
  const isCenter = align.id === "center";
  return (
    <button
      onClick={onClick}
      className={`tap flex-1 rounded-xl border-2 p-3 bg-base-850 ${
        selected ? "border-accent-500" : "border-base-700"
      }`}
    >
      <div className={`space-y-1 flex flex-col ${isCenter ? "items-center" : "items-start"}`}>
        <div className="h-1 rounded-full bg-white/50 w-3/4" />
        <div className="h-1 rounded-full bg-white/30 w-1/2" />
        <div className="h-1 rounded-full bg-white/30 w-2/3" />
      </div>
      <p className="mt-2 text-[10px] font-medium text-white/70 text-center">{label}</p>
    </button>
  );
}

export default function Templates({ draft, setDraft, onBack, onNext }) {
  const [cat, setCat] = useState("Всі");
  const visible = cat === "Всі" ? TEMPLATES : TEMPLATES.filter((t) => t.cat === cat);
  const colorScheme = draft.colorScheme || DEFAULT_COLOR_THEME;
  const align = draft.align || "left";

  return (
    <div className="flex-1 flex flex-col bg-base-950">

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
                ? "bg-accent-500 border-accent-500 text-base-950"
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

        <p className="text-sm font-semibold text-white/85 mt-6 mb-2">Кольорова тема</p>
        <div className="grid grid-cols-2 gap-3">
          {COLOR_THEMES.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              label={theme.name.uk}
              selected={colorScheme === theme.id}
              onClick={() => setDraft({ ...draft, colorScheme: theme.id })}
            />
          ))}
        </div>

        <p className="text-sm font-semibold text-white/85 mt-6 mb-2">Фото (аватар, можна гіф)</p>
        <input
          className="w-full bg-base-850 border border-base-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-accent-500"
          placeholder="https://i.imgur.com/... або .gif"
          value={draft.avatarUrl || ""}
          onChange={(e) => setDraft({ ...draft, avatarUrl: e.target.value.trim() })}
        />
        <p className="text-xs text-white/40 mt-1.5 mb-6">
          Вставте посилання на своє фото чи гіфку — вона стане аватаром у резюме замість ініціалів. Немає, де хостити
          фото? Завантажте його на{" "}
          <a
            href="https://imgur.com/upload"
            target="_blank"
            rel="noreferrer"
            className="text-accent-400 underline underline-offset-2"
          >
            imgur.com
          </a>{" "}
          або гіфку на{" "}
          <a
            href="https://giphy.com"
            target="_blank"
            rel="noreferrer"
            className="text-accent-400 underline underline-offset-2"
          >
            giphy.com
          </a>{" "}
          і скопіюйте пряме посилання на зображення.
        </p>

        <p className="text-sm font-semibold text-white/85 mt-6 mb-2">Фон (картинка або гіф)</p>
        <input
          className="w-full bg-base-850 border border-base-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-accent-500"
          placeholder="https://... .jpg / .png / .gif"
          value={draft.backgroundUrl || ""}
          onChange={(e) => setDraft({ ...draft, backgroundUrl: e.target.value.trim() })}
        />
        <p className="text-xs text-white/40 mt-1.5 mb-6">
          Вставте посилання на зображення чи гіфку — вона стане фоном резюме. Залиште порожнім, щоб лишити колір теми.
          Шукайте гіфки на{" "}
          <a
            href="https://giphy.com"
            target="_blank"
            rel="noreferrer"
            className="text-accent-400 underline underline-offset-2"
          >
            giphy.com
          </a>
          .
        </p>

        <p className="text-sm font-semibold text-white/85 mt-6 mb-2">Вирівнювання тексту</p>
        <div className="flex gap-3">
          {ALIGNMENTS.map((a) => (
            <AlignOption
              key={a.id}
              align={a}
              label={a.name.uk}
              selected={align === a.id}
              onClick={() => setDraft({ ...draft, align: a.id })}
            />
          ))}
        </div>
      </div>

      <div className="px-6 pb-6 pt-2">
        <button
          onClick={onNext}
          className="tap w-full flex items-center justify-center gap-2 bg-accent-500 text-base-950 font-semibold text-sm rounded-xl py-3.5"
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
