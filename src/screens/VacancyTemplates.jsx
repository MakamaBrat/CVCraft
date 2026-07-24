import { useLanguage } from "../lib/i18n/index.jsx";
import PageBackground from "../components/PageBackground.jsx";
import { COLOR_THEMES, ALIGNMENTS, DEFAULT_COLOR_THEME } from "../lib/docTheme.js";
import GifUrlField from "../components/GifUrlField.jsx";

const SECTION_LABELS = {
  theme: { uk: "Кольорова тема", ru: "Цветовая тема", en: "Color theme" },
  align: { uk: "Вирівнювання тексту", ru: "Выравнивание текста", en: "Text alignment" },
  avatar: { uk: "Лого / фото компанії (можна гіф)", ru: "Лого / фото компании (можно гиф)", en: "Company logo / photo (GIF supported)" },
  avatarHint: {
    uk: "Вставте посилання на лого, фото чи гіфку — вона стане аватаром вакансії замість ініціалів. Немає, де хостити? Завантажте фото на",
    ru: "Вставьте ссылку на лого, фото или гиф — она станет аватаром вакансии вместо инициалов. Негде хостить? Загрузите фото на",
    en: "Paste a link to a logo, photo, or GIF — it becomes the vacancy's avatar instead of initials. No place to host it? Upload a photo to",
  },
  avatarHintGif: {
    uk: "або гіфку на",
    ru: "или гиф на",
    en: "or a GIF on",
  },
  background: { uk: "Фон (картинка або гіф)", ru: "Фон (картинка или гиф)", en: "Background (image or GIF)" },
  backgroundHint: {
    uk: "Вставте посилання на зображення чи гіфку (підійде і giphy.com/gifs/..., не обов'язково пряме .gif) — вона стане фоном вакансії. Залиште порожнім, щоб лишити колір теми. Шукайте гіфки на",
    ru: "Вставьте ссылку на изображение или гиф (подойдёт и giphy.com/gifs/..., не обязательно прямая .gif) — она станет фоном вакансии. Оставьте пустым, чтобы оставить цвет темы. Ищите гифки на",
    en: "Paste a link to an image or GIF (a giphy.com/gifs/... page link works too, not just a direct .gif) — it becomes the job post's background. Leave empty to keep the theme color. Find GIFs on",
  },
  diceGifLabel: {
    uk: "Випадкова гіфка з Giphy",
    ru: "Случайный гиф из Giphy",
    en: "Random GIF from Giphy",
  },
  gifLoadError: {
    uk: "Не вдалось завантажити гіфку, спробуйте ще раз.",
    ru: "Не удалось загрузить гиф, попробуйте ещё раз.",
    en: "Couldn't load a GIF, please try again.",
  },
};

const TEMPLATES = [
  { id: "minimal", accent: "#9aa0a6" },
  { id: "modern", accent: "#6c5ce7" },
  { id: "bold", accent: "#ff7a59" },
  { id: "classic", accent: "#4c9be8" },
];

const NAMES = {
  uk: { minimal: "Мінімал", modern: "Сучасний", bold: "Виразний", classic: "Класичний" },
  ru: { minimal: "Минимал", modern: "Современный", bold: "Яркий", classic: "Классический" },
  en: { minimal: "Minimal", modern: "Modern", bold: "Bold", classic: "Classic" },
};

function MiniCard({ tpl, vacancy, name, selected, onClick }) {
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
          <p className="text-[9px] font-semibold truncate">{vacancy.position || "Unity Developer"}</p>
          <p className="text-[7px] text-black/50 truncate">{vacancy.company || "Ubisoft"}</p>
        </div>
      </div>
      <div className="space-y-1">
        <div className="h-1 rounded-full bg-black/10 w-full" />
        <div className="h-1 rounded-full bg-black/10 w-4/5" />
        <div className="h-1 rounded-full bg-black/10 w-full mt-2" style={{ background: tpl.accent, opacity: 0.5 }} />
        <div className="h-1 rounded-full bg-black/10 w-3/5" />
      </div>
      <p className="mt-2 text-[8px] font-medium text-black/60">{name}</p>
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

export default function VacancyTemplates({ draft, setDraft, onBack, onNext }) {
  const { lang, t } = useLanguage();
  const names = NAMES[lang];
  const colorScheme = draft.colorScheme || DEFAULT_COLOR_THEME;
  const align = draft.align || "left";

  return (
    <PageBackground>
<div className="flex-1 flex flex-col">

      <div className="px-6 pt-2 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="tap w-8 h-8 flex items-center justify-center text-white/70">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 3L5 9l6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-bold">{{ uk: "Оберіть шаблон", ru: "Выберите шаблон", en: "Choose template" }[lang]}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-4">
        <div className="stagger grid grid-cols-2 gap-3">
          {TEMPLATES.map((tpl) => (
            <MiniCard
              key={tpl.id}
              tpl={tpl}
              vacancy={draft}
              name={names[tpl.id]}
              selected={draft.template === tpl.id}
              onClick={() => setDraft({ ...draft, template: tpl.id })}
            />
          ))}
        </div>

        <p className="text-sm font-semibold text-white/85 mt-6 mb-2">{SECTION_LABELS.theme[lang]}</p>
        <div className="stagger grid grid-cols-2 gap-3">
          {COLOR_THEMES.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              label={theme.name[lang]}
              selected={colorScheme === theme.id}
              onClick={() => setDraft({ ...draft, colorScheme: theme.id })}
            />
          ))}
        </div>

        <p className="text-sm font-semibold text-white/85 mt-6 mb-2">{SECTION_LABELS.avatar[lang]}</p>
        <GifUrlField
          value={draft.avatarUrl}
          onChange={(url) => setDraft({ ...draft, avatarUrl: url })}
          placeholder="https://i.imgur.com/..."
          tag="company logo"
          diceLabel={SECTION_LABELS.diceGifLabel[lang]}
          errorLabel={SECTION_LABELS.gifLoadError[lang]}
        />
        <p className="text-xs text-white/40 mt-1.5 mb-6">
          {SECTION_LABELS.avatarHint[lang]}{" "}
          <a
            href="https://imgur.com/upload"
            target="_blank"
            rel="noreferrer"
            className="text-accent-400 underline underline-offset-2"
          >
            imgur.com
          </a>{" "}
          {SECTION_LABELS.avatarHintGif[lang]}{" "}
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

        <p className="text-sm font-semibold text-white/85 mt-6 mb-2">{SECTION_LABELS.background[lang]}</p>
        <GifUrlField
          value={draft.backgroundUrl}
          onChange={(url) => setDraft({ ...draft, backgroundUrl: url })}
          placeholder="https://... .jpg / .png / .gif"
          tag="background texture"
          diceLabel={SECTION_LABELS.diceGifLabel[lang]}
          errorLabel={SECTION_LABELS.gifLoadError[lang]}
        />
        <p className="text-xs text-white/40 mt-1.5 mb-6">
          {SECTION_LABELS.backgroundHint[lang]}{" "}
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

        <p className="text-sm font-semibold text-white/85 mt-6 mb-2">{SECTION_LABELS.align[lang]}</p>
        <div className="flex gap-3">
          {ALIGNMENTS.map((a) => (
            <AlignOption
              key={a.id}
              align={a}
              label={a.name[lang]}
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
          {t("common.next")}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
</PageBackground>
  );
}
