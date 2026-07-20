import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api.js";
import TagPicker from "../components/TagPicker.jsx";
import { confirmDialog } from "../lib/telegram.js";

const TOTAL_STEPS = 6;
const STEP_TITLES = ["Основне", "Контакти", "Досвід", "Освіта", "Навички", "Портфоліо"];

function Field({ label, hint, children }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-white/85 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-white/40 mt-1.5">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full bg-base-850 border border-base-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-accent-500 transition-colors";

export default function Wizard({ draft, setDraft, step, setStep, onBackHome, onFinishInfo }) {
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const canNext = () => {
    if (step === 0) return draft.fullName.trim() && draft.role.trim();
    return true;
  };

  const next = () => {
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
    else onFinishInfo();
  };
  const back = () => {
    if (step === 0) onBackHome();
    else setStep(step - 1);
  };

  const isDirty = () =>
    Boolean(
      draft.fullName?.trim() ||
        draft.role?.trim() ||
        draft.email?.trim() ||
        draft.phone?.trim() ||
        draft.city?.trim() ||
        draft.summary?.trim() ||
        (draft.experience || []).length > 0 ||
        (draft.education || []).length > 0 ||
        (draft.skills || []).length > 0 ||
        (draft.portfolio || []).length > 0
    );

  const goHome = async () => {
    if (isDirty() && !(await confirmDialog("Вийти без збереження? Введені дані буде втрачено."))) return;
    onBackHome();
  };

  return (
    <div className="flex-1 flex flex-col bg-base-950">

      <div className="px-6 pt-2 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={back} className="tap w-8 h-8 flex items-center justify-center text-white/70">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 3L5 9l6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="text-xs text-white/45 font-medium">
            Крок {step + 1} з {TOTAL_STEPS}
          </span>
          <button onClick={goHome} className="tap w-8 h-8 ml-auto flex items-center justify-center text-white/70">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M2.5 8L9 2.5 15.5 8M4 6.8V15h10V6.8"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <div className="h-1.5 bg-base-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-500 rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-4 fade-up" key={step}>
        <h1 className="text-xl font-bold mb-5">{STEP_TITLES[step]}</h1>

        {step === 0 && (
          <>
            <Field label="Як вас звати?">
              <input
                className={inputCls}
                placeholder="Іван Петренко"
                value={draft.fullName}
                onChange={(e) => set({ fullName: e.target.value })}
              />
            </Field>
            <Field
              label="Ваша посада"
              hint="Вкажіть вашу поточну посаду або ту, на яку ви претендуєте."
            >
              <input
                className={inputCls}
                placeholder="Unity Developer"
                value={draft.role}
                onChange={(e) => set({ role: e.target.value })}
              />
            </Field>
            <Field label="Про себе" hint="Кілька речень про ваш професійний досвід.">
              <textarea
                className={inputCls + " min-h-[110px] resize-none"}
                placeholder="Розробник з 3-річним досвідом створення мобільних ігор на Unity..."
                value={draft.summary}
                onChange={(e) => set({ summary: e.target.value })}
              />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Email">
              <input
                className={inputCls}
                placeholder="ivan.petrenko@gmail.com"
                value={draft.email}
                onChange={(e) => set({ email: e.target.value })}
              />
            </Field>
            <Field label="Юзернейм у Telegram" hint="Роботодавці зв'язуватимуться з вами через цей юзернейм.">
              <input
                className={inputCls}
                placeholder="@ivan_petrenko"
                value={draft.phone}
                onChange={(e) => {
                  let v = e.target.value.replace(/\s/g, "");
                  if (v && !v.startsWith("@")) v = "@" + v;
                  set({ phone: v });
                }}
              />
            </Field>
            <Field label="Місто">
              <input
                className={inputCls}
                placeholder="Київ, Україна"
                value={draft.city}
                onChange={(e) => set({ city: e.target.value })}
              />
            </Field>
          </>
        )}

        {step === 2 && <ExperienceStep draft={draft} set={set} />}
        {step === 3 && <EducationStep draft={draft} set={set} />}
        {step === 4 && <SkillsStep draft={draft} set={set} />}
        {step === 5 && <PortfolioStep draft={draft} set={set} />}
      </div>

      <div className="px-6 pb-6 pt-2">
        <button
          onClick={next}
          disabled={!canNext()}
          className="tap w-full flex items-center justify-center gap-2 bg-accent-500 disabled:bg-base-700 disabled:text-white/30 text-base-950 font-semibold text-sm rounded-xl py-3.5"
        >
          {step < TOTAL_STEPS - 1 ? "Далі" : "Обрати шаблон"}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function listAdd(list, item) {
  return [...list, { id: crypto.randomUUID(), ...item }];
}

function ExperienceStep({ draft, set }) {
  const [item, setItem] = useState({ company: "", position: "", period: "", description: "" });

  const add = () => {
    if (!item.company.trim() || !item.position.trim()) return;
    set({ experience: listAdd(draft.experience, item) });
    setItem({ company: "", position: "", period: "", description: "" });
  };
  const remove = (id) => set({ experience: draft.experience.filter((x) => x.id !== id) });

  return (
    <div>
      {draft.experience.map((e) => (
        <div key={e.id} className="bg-base-850 border border-base-700 rounded-xl p-4 mb-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-sm">{e.position}</p>
              <p className="text-xs text-white/50">{e.company} · {e.period}</p>
            </div>
            <button onClick={() => remove(e.id)} className="tap text-white/30 hover:text-red-400 text-xs">
              Видалити
            </button>
          </div>
        </div>
      ))}

      <Field label="Компанія">
        <input className={inputCls} placeholder="Ubisoft" value={item.company}
          onChange={(e) => setItem({ ...item, company: e.target.value })} />
      </Field>
      <Field label="Посада">
        <input className={inputCls} placeholder="Unity Developer" value={item.position}
          onChange={(e) => setItem({ ...item, position: e.target.value })} />
      </Field>
      <Field label="Період">
        <input className={inputCls} placeholder="2022 — тепер" value={item.period}
          onChange={(e) => setItem({ ...item, period: e.target.value })} />
      </Field>
      <Field label="Опис обов'язків">
        <textarea className={inputCls + " min-h-[90px] resize-none"} placeholder="Розробка ігрової механіки, оптимізація продуктивності..."
          value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} />
      </Field>
      <button onClick={add} className="tap w-full border border-dashed border-accent-500/50 text-accent-300 text-sm font-medium rounded-xl py-2.5">
        + Додати досвід
      </button>
    </div>
  );
}

function EducationStep({ draft, set }) {
  const [item, setItem] = useState({ school: "", degree: "", period: "" });

  const add = () => {
    if (!item.school.trim()) return;
    set({ education: listAdd(draft.education, item) });
    setItem({ school: "", degree: "", period: "" });
  };
  const remove = (id) => set({ education: draft.education.filter((x) => x.id !== id) });

  return (
    <div>
      {draft.education.map((e) => (
        <div key={e.id} className="bg-base-850 border border-base-700 rounded-xl p-4 mb-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-sm">{e.school}</p>
              <p className="text-xs text-white/50">{e.degree} · {e.period}</p>
            </div>
            <button onClick={() => remove(e.id)} className="tap text-white/30 hover:text-red-400 text-xs">
              Видалити
            </button>
          </div>
        </div>
      ))}

      <Field label="Навчальний заклад">
        <input className={inputCls} placeholder="КПІ ім. Ігоря Сікорського" value={item.school}
          onChange={(e) => setItem({ ...item, school: e.target.value })} />
      </Field>
      <Field label="Спеціальність / ступінь">
        <input className={inputCls} placeholder="Комп'ютерні науки, бакалавр" value={item.degree}
          onChange={(e) => setItem({ ...item, degree: e.target.value })} />
      </Field>
      <Field label="Період">
        <input className={inputCls} placeholder="2018 — 2022" value={item.period}
          onChange={(e) => setItem({ ...item, period: e.target.value })} />
      </Field>
      <button onClick={add} className="tap w-full border border-dashed border-accent-500/50 text-accent-300 text-sm font-medium rounded-xl py-2.5">
        + Додати освіту
      </button>
    </div>
  );
}

export function detectMediaType(url) {
  if (!url) return null;
  const u = url.trim();
  if (/\.(gif)(\?.*)?$/i.test(u)) return "gif";
  if (/\.(pdf)(\?.*)?$/i.test(u)) return "pdf";
  if (/\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(u)) return "video";
  if (/youtube\.com\/watch\?v=|youtu\.be\//i.test(u)) return "youtube";
  if (/youtube\.com\/shorts\//i.test(u)) return "youtube";
  if (/vimeo\.com\//i.test(u)) return "vimeo";
  if (/docs\.google\.com\/document\//i.test(u)) return "gdoc";
  if (/figma\.com\/(file|design|proto)\//i.test(u)) return "figma";
  if (/google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(u)) return "map";
  if (/tiktok\.com\//i.test(u)) return "tiktok";
  if (/instagram\.com\//i.test(u)) return "instagram";
  if (/threads\.net\//i.test(u)) return "threads";
  if (/(^|\/\/)t\.me\//i.test(u)) return "telegram";
  if (/play\.google\.com\/store\/apps/i.test(u)) return "googleplay";
  if (/apps\.apple\.com\//i.test(u)) return "appstore";
  if (/olx\.[a-z.]+\//i.test(u)) return "olx";
  if (/(chats\.)?viber\.com\/|invite\.viber\.com\/|^viber:\/\//i.test(u)) return "viber";
  if (/wa\.me\/|api\.whatsapp\.com\/|whatsapp\.com\/channel\//i.test(u)) return "whatsapp";
  return "link";
}

function PortfolioStep({ draft, set }) {
  const [item, setItem] = useState({ title: "", url: "" });
  const portfolio = draft.portfolio || [];

  const add = () => {
    if (!item.url.trim()) return;
    set({
      portfolio: [
        ...portfolio,
        { id: crypto.randomUUID(), title: item.title.trim(), url: item.url.trim(), type: detectMediaType(item.url) },
      ],
    });
    setItem({ title: "", url: "" });
  };
  const remove = (id) => set({ portfolio: portfolio.filter((x) => x.id !== id) });

  return (
    <div>
      {portfolio.map((p) => (
        <div key={p.id} className="bg-base-850 border border-base-700 rounded-xl p-3 mb-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="font-medium text-sm truncate">{p.title || "Без назви"}</p>
            <button onClick={() => remove(p.id)} className="tap shrink-0 text-white/30 hover:text-red-400 text-xs">
              Видалити
            </button>
          </div>
          <p className="text-xs text-white/40 truncate mb-2">{p.url}</p>
          <MediaPreview item={p} />
        </div>
      ))}

      <Field label="Назва прикладу" hint="Наприклад: демо гри, трейлер, дизайн UI.">
        <input
          className={inputCls}
          placeholder="Демо мобільної гри"
          value={item.title}
          onChange={(e) => setItem({ ...item, title: e.target.value })}
        />
      </Field>
      <Field
        label="Посилання на приклад"
        hint="YouTube, Vimeo, TikTok, Instagram, Threads, Telegram, Viber, WhatsApp, OLX, Google Play, App Store, Figma, Google Docs, Google Maps, .mp4, .gif або .pdf."
      >
        <input
          className={inputCls}
          placeholder="https://youtube.com/watch?v=..."
          value={item.url}
          onChange={(e) => setItem({ ...item, url: e.target.value })}
        />
      </Field>
      <button onClick={add} className="tap w-full border border-dashed border-accent-500/50 text-accent-300 text-sm font-medium rounded-xl py-2.5">
        + Додати приклад роботи
      </button>
    </div>
  );
}

function youtubeId(url) {
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}
function vimeoId(url) {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}
function gdocId(url) {
  const m = url.match(/document\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}
// Перетворює звичайне посилання Google Maps на embed-версію (додає
// output=embed). Для скорочених посилань (maps.app.goo.gl, goo.gl/maps)
// вбудувати напряму не вдається — Google Maps блокує їх у iframe, тож
// такі лишаємо як звичайне посилання (фолбек нижче).
function mapsEmbedUrl(url) {
  if (!/^https?:\/\/(www\.)?google\.[a-z.]+\/maps/i.test(url)) return null;
  if (/output=embed/i.test(url)) return url;
  return url + (url.includes("?") ? "&" : "?") + "output=embed";
}

// TikTok/Instagram/Threads всередині Telegram-мінідодатку (webview) не
// дають стабільно вбудувати сам пост — навіть офіційний embed.js часто
// блокується політикою вебв'ю чи приватністю акаунта. Тому замість
// "то працює, то ні" iframe робимо те, що працює завжди: гарну кнопку
// в стилі сервісу, яка одразу відкриває пост у застосунку/браузері.
const SOCIAL_STYLES = {
  tiktok: {
    label: "TikTok",
    bg: "#000000",
    fg: "#ffffff",
    icon: (
      <path d="M13.5 2h2.6c.15 1.4.85 2.6 2 3.4.85.6 1.85.95 2.9 1v2.65c-1.5.05-2.95-.4-4.2-1.25v6.5c0 3.15-2.55 5.7-5.7 5.7S5.4 17.45 5.4 14.3c0-3.05 2.4-5.55 5.4-5.68v2.7a2.98 2.98 0 00-1.6 5.5c1.5.95 3.5-.1 3.5-1.9V2z" />
    ),
  },
  instagram: {
    label: "Instagram",
    bg: "linear-gradient(45deg,#f9ce34,#ee2a7b,#6228d7)",
    fg: "#ffffff",
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
      </>
    ),
  },
  threads: {
    label: "Threads",
    bg: "#000000",
    fg: "#ffffff",
    icon: (
      <path d="M12 2C6.9 2 4 5.1 4 9.3v5.4C4 19 6.9 22 12 22s8-3 8-7.3V9.3C20 5.1 17.1 2 12 2zm3 12.6c0 2.1-1.2 3.3-3 3.3s-2.7-.9-2.7-2c0-1.2 1-2 2.9-2.2.9-.1 1.4-.3 1.4-.8 0-.6-.6-1-1.5-1-.8 0-1.4.3-1.7.9l-1.6-.7c.5-1.2 1.7-1.9 3.3-1.9 2 0 3.4 1.1 3.4 3v1.4z" />
    ),
  },
  telegram: {
    label: "Telegram",
    bg: "#26A5E4",
    fg: "#ffffff",
    icon: (
      <path d="M21.5 4.5L2.8 11.7c-1 .4-1 1.6.1 1.9l4.6 1.5 1.8 5.6c.3.9 1.4 1.1 2 .4l2.5-2.8 4.6 3.4c.8.6 2 .2 2.2-.8l3-16.6c.2-1-.8-1.8-1.7-1.4zM8.6 14.3l9.2-6.5c.3-.2.6.2.3.4l-7.5 7.2c-.3.3-.5.7-.5 1.1l-.2 2.4-1.3-4.6z" />
    ),
  },
  whatsapp: {
    label: "WhatsApp",
    bg: "#25D366",
    fg: "#ffffff",
    icon: (
      <path d="M12 2a10 10 0 00-8.6 15L2 22l5.2-1.4A10 10 0 1012 2zm0 18.2a8.1 8.1 0 01-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.3.2-.4.1-.2 0-.3 0-.5-.1-.1-.6-1.4-.8-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.2s1 2.5 1.1 2.7c.1.2 2 3 4.7 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.2-.4-.3z" />
    ),
  },
  viber: {
    label: "Viber",
    bg: "#7360F2",
    fg: "#ffffff",
    icon: (
      <path d="M12 2C6.9 2 3 5.3 3 9.9c0 2.6 1.3 4.9 3.4 6.4-.1.8-.5 2.3-1.4 3.9 1.7-.3 3.3-1 4.4-1.7.9.2 1.7.3 2.6.3 5.1 0 9-3.3 9-7.9S17.1 2 12 2zm4.1 10.6c-.2.4-1 .8-1.4.9-.4.1-.8.2-2.6-.6-2.2-1-3.6-3.3-3.7-3.4-.1-.1-.9-1.1-.9-2.2 0-1 .5-1.5.7-1.7.2-.2.5-.3.6-.3h.5c.2 0 .4 0 .5.4.2.4.6 1.4.7 1.5.1.1.1.3 0 .4-.1.2-.1.3-.3.4-.1.2-.3.3-.4.5-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.5 1.5.3.1.5.1.7-.1.2-.2.7-.8.9-1.1.2-.3.4-.2.6-.1.2.1 1.4.7 1.6.8.2.1.4.2.4.3.1.2.1.6-.1 1z" />
    ),
  },
  olx: {
    label: "OLX",
    bg: "#002F34",
    fg: "#23E5DB",
    icon: (
      <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm4.3 3.2a2.9 2.9 0 100 5.8 2.9 2.9 0 000-5.8zm7.2.2h-1.6v5.3h1.6V9.4zm2.3 0h-1.6v5.3h3.4v-1.4h-1.8V9.4z" />
    ),
  },
};

function SocialButton({ type, url, title }) {
  const s = SOCIAL_STYLES[type];
  if (!s) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-xl px-4 py-3 no-underline"
      style={{ background: s.bg, color: s.fg }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        {s.icon}
      </svg>
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">{title || s.label}</p>
        <p className="text-xs opacity-80">{`Відкрити в ${s.label}`}</p>
      </div>
      <svg width="14" height="14" viewBox="0 0 15 15" fill="none" className="ml-auto shrink-0">
        <path d="M5 3l5 4.5L5 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}

const APP_STORE_META = {
  googleplay: { label: "Завантажити в Google Play", bg: "#000000", fg: "#ffffff" },
  appstore: { label: "Завантажити в App Store", bg: "#000000", fg: "#ffffff" },
};

// Google Play / App Store не віддають щось зручне для одразу-embed, тому
// показуємо картку застосунку: іконка + назва, підтягнуті з og:-тегів
// сторінки через наш бекенд (/api/link-preview, щоб обійти CORS). Поки
// йде запит — показуємо скелетон-прелоадер; якщо не вдалось (немає
// мережі, застосунок видалений тощо) — падаємо назад на просту кнопку.
function AppStoreCard({ type, url, title }) {
  const meta = APP_STORE_META[type];
  const [state, setState] = useState({ loading: true, title: null, image: null, failed: false });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, title: null, image: null, failed: false });
    apiFetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then((data) => {
        if (cancelled) return;
        setState({ loading: false, title: data?.title || null, image: data?.image || null, failed: false });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ loading: false, title: null, image: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (state.loading) {
    return (
      <div className="flex items-center gap-3 rounded-xl px-4 py-3 bg-base-800 border border-base-700 animate-pulse">
        <div className="w-11 h-11 rounded-xl bg-base-700 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="h-3 bg-base-700 rounded w-3/4 mb-2" />
          <div className="h-2.5 bg-base-700 rounded w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-xl px-4 py-3 no-underline"
      style={{ background: meta.bg, color: meta.fg }}
    >
      {!state.failed && state.image ? (
        <img src={state.image} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0 bg-white" />
      ) : (
        <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            {type === "googleplay" ? (
              <path d="M4.5 3.5c-.3.3-.5.7-.5 1.2v14.6c0 .5.2.9.5 1.2l8.4-8.5L4.5 3.5zM14 12l2.4-2.4L6.1 3.7c-.3-.2-.7-.3-1-.2L14 12zm0 0l-8.9 8.5c.3.1.7 0 1-.2l10.3-5.9L14 12zm3.4-3.4L15 12l2.4 3.4 3-1.7c.8-.5.8-1.7 0-2.1l-3-1.7z" />
            ) : (
              <path d="M16.5 1.5c.1 1.1-.3 2.2-1 3-.7.8-1.9 1.5-3 1.4-.1-1.1.4-2.2 1-3 .8-.9 2-1.5 3-1.4zm3.4 15.9c-.5 1.1-.7 1.6-1.3 2.6-.9 1.4-2.2 3.1-3.7 3.1-1.4 0-1.7-.9-3.6-.9-1.9 0-2.3.9-3.6.9-1.5 0-2.7-1.6-3.6-3-2.5-3.8-2.8-8.3-1.2-10.7 1.1-1.7 2.9-2.7 4.5-2.7 1.7 0 2.7 1 4.1 1s2.2-1 4.1-.9c1.4.1 2.9.6 3.9 2-2.4 1.5-2.1 5.1.4 6.9-.4 1-.6 1.4-1 1.7z" />
            )}
          </svg>
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">{title || state.title || meta.label}</p>
        <p className="text-xs opacity-80">{meta.label}</p>
      </div>
      <svg width="14" height="14" viewBox="0 0 15 15" fill="none" className="ml-auto shrink-0">
        <path d="M5 3l5 4.5L5 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}

export function MediaPreview({ item }) {
  const type = item.type || detectMediaType(item.url);
  if (type === "youtube") {
    const id = youtubeId(item.url);
    if (!id) return null;
    return (
      <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
        <iframe
          src={`https://www.youtube.com/embed/${id}`}
          title={item.title || "video"}
          className="absolute inset-0 w-full h-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  if (type === "vimeo") {
    const id = vimeoId(item.url);
    if (!id) return null;
    return (
      <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
        <iframe
          src={`https://player.vimeo.com/video/${id}`}
          title={item.title || "video"}
          className="absolute inset-0 w-full h-full"
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  if (type === "video") {
    return (
      <video src={item.url} controls className="w-full rounded-lg bg-black" style={{ maxHeight: 220 }} />
    );
  }
  if (type === "gif") {
    return <img src={item.url} alt={item.title || "gif"} className="w-full rounded-lg object-cover" style={{ maxHeight: 220 }} />;
  }
  if (type === "pdf") {
    return (
      <iframe
        src={item.url}
        title={item.title || "pdf"}
        className="w-full rounded-lg bg-white"
        style={{ height: 400 }}
      />
    );
  }
  if (type === "gdoc") {
    const id = gdocId(item.url);
    if (!id) {
      return (
        <a href={item.url} target="_blank" rel="noreferrer" className="text-xs text-accent-300 underline break-all">
          {item.url}
        </a>
      );
    }
    return (
      <iframe
        src={`https://docs.google.com/document/d/${id}/preview`}
        title={item.title || "Google Doc"}
        className="w-full rounded-lg bg-white"
        style={{ height: 420, border: 0 }}
      />
    );
  }
  if (type === "tiktok" || type === "instagram" || type === "threads" || type === "telegram" || type === "olx" || type === "viber" || type === "whatsapp") {
    return <SocialButton type={type} url={item.url} title={item.title} />;
  }
  if (type === "googleplay" || type === "appstore") {
    return <AppStoreCard type={type} url={item.url} title={item.title} />;
  }
  if (type === "figma") {
    return (
      <iframe
        src={`https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(item.url)}`}
        title={item.title || "figma"}
        className="w-full rounded-lg bg-white"
        style={{ height: 360, border: 0 }}
        allowFullScreen
      />
    );
  }
  if (type === "map") {
    const embedUrl = mapsEmbedUrl(item.url);
    if (!embedUrl) {
      return (
        <a href={item.url} target="_blank" rel="noreferrer" className="text-xs text-accent-300 underline break-all">
          {item.url}
        </a>
      );
    }
    return (
      <iframe
        src={embedUrl}
        title={item.title || "map"}
        className="w-full rounded-lg"
        style={{ height: 260, border: 0 }}
        loading="lazy"
      />
    );
  }
  return (
    <a href={item.url} target="_blank" rel="noreferrer" className="text-xs text-accent-300 underline break-all">
      {item.url}
    </a>
  );
}

function SkillsStep({ draft, set }) {
  return (
    <div>
      <Field label="Навички" hint="Клікайте на теги зі списку або впишіть свій і натисніть Enter.">
        <TagPicker
          value={draft.skills}
          onChange={(skills) => set({ skills })}
          placeholder="Свій варіант, напр. Unity"
          addLabel="Додати"
          moreLabel="Показати ще"
          lessLabel="Згорнути"
        />
      </Field>
    </div>
  );
}
