import { useState, useEffect, useRef } from "react";
import { apiFetch } from "../lib/api.js";
import { normalizeMediaUrl } from "../lib/media.js";
import TagPicker from "../components/TagPicker.jsx";
import { getTelegramWebApp, getTelegramUser } from "../lib/telegram.js";
import { useLanguage } from "../lib/i18n/index.jsx";

const TOTAL_STEPS = 6;
const REMOTE_VALUE = "Remote";

function Field({ label, hint, children, aside }) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <label className="block text-sm font-medium text-white/85">{label}</label>
        {aside}
      </div>
      {children}
      {hint && <p className="text-xs text-white/40 mt-1.5">{hint}</p>}
    </div>
  );
}

function InlineCheckbox({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="tap shrink-0 flex items-center gap-1.5 text-xs font-medium text-white/60"
    >
      <span
        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
          checked ? "bg-accent-500 border-accent-500" : "border-base-600"
        }`}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-6" stroke="#0a0a0a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {label}
    </button>
  );
}

const inputCls =
  "w-full bg-base-850 border border-base-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-accent-500 transition-colors";

export default function Wizard({ draft, setDraft, step, setStep, onBackHome, onFinishInfo }) {
  const { t } = useLanguage();
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  // Кроки з формою "додати запис" (досвід/освіта/портфоліо) реєструють тут
  // функцію, яка на переході "Далі" автоматично додає введену, але не
  // підтверджену кнопкою "Додати" запис — щоб дані не губилися, якщо юзер
  // просто натиснув "Далі", забувши натиснути "Додати".
  const pendingFlushRef = useRef(null);
  const registerFlush = (fn) => {
    pendingFlushRef.current = fn;
  };

  // Запам'ятовуємо введене місто, щоб повернути його, якщо галочку Remote
  // зняли — сам вибір "Remote" зберігається прямо в draft.city.
  const prevCityRef = useRef("");
  const isRemote = (draft.city || "").trim() === REMOTE_VALUE;
  const toggleRemote = () => {
    if (isRemote) {
      set({ city: prevCityRef.current || "" });
    } else {
      prevCityRef.current = draft.city || "";
      set({ city: REMOTE_VALUE });
    }
  };

  // Підставляємо юзернейм з Telegram у поле "Юзернейм у Telegram", якщо воно
  // ще не заповнене (наприклад, чернетка вже містить збережене значення).
  useEffect(() => {
    if (draft.phone?.trim()) return;
    const tgUser = getTelegramUser();
    if (tgUser?.username) set({ phone: "@" + tgUser.username });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canNext = () => {
    if (step === 0) return draft.fullName.trim() && draft.role.trim();
    return true;
  };

  const next = () => {
    pendingFlushRef.current?.();
    pendingFlushRef.current = null;
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
    else onFinishInfo();
  };
  const back = () => {
    pendingFlushRef.current?.();
    pendingFlushRef.current = null;
    if (step === 0) onBackHome();
    else setStep(step - 1);
  };

  // Вихід більше не показує попередження про втрату даних: App.jsx сам
  // автоматично зберігає прогрес як чернетку (status: "draft") ще під час
  // заповнення, тож дані нікуди не зникають.
  const goHome = () => onBackHome();

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
            {t("wizard.stepOf")(step + 1, TOTAL_STEPS)}
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
        <h1 className="text-xl font-bold mb-5">{t("wizard.stepTitles")[step]}</h1>

        {step === 0 && (
          <>
            <Field label={t("wizard.nameLabel")}>
              <input
                className={inputCls}
                placeholder={t("wizard.namePlaceholder")}
                value={draft.fullName}
                onChange={(e) => set({ fullName: e.target.value })}
              />
            </Field>
            <Field
              label={t("wizard.roleLabel")}
              hint={t("wizard.roleHint")}
            >
              <input
                className={inputCls}
                placeholder={t("wizard.rolePlaceholder")}
                value={draft.role}
                onChange={(e) => set({ role: e.target.value })}
              />
            </Field>
            <Field label={t("wizard.summaryLabel")} hint={t("wizard.summaryHint")}>
              <textarea
                className={inputCls + " min-h-[110px] resize-none"}
                placeholder={t("wizard.summaryPlaceholder")}
                value={draft.summary}
                onChange={(e) => set({ summary: e.target.value })}
              />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <Field label={t("wizard.emailLabel")}>
              <input
                className={inputCls}
                placeholder={t("wizard.emailPlaceholder")}
                value={draft.email}
                onChange={(e) => set({ email: e.target.value })}
              />
            </Field>
            <Field label={t("wizard.telegramLabel")} hint={t("wizard.telegramHint")}>
              <input
                className={inputCls}
                placeholder={t("wizard.telegramPlaceholder")}
                value={draft.phone}
                onChange={(e) => {
                  let v = e.target.value.replace(/\s/g, "");
                  if (v && !v.startsWith("@")) v = "@" + v;
                  set({ phone: v });
                }}
              />
            </Field>
            <Field
              label={t("wizard.cityLabel")}
              aside={<InlineCheckbox checked={isRemote} onChange={toggleRemote} label={t("wizard.remoteLabel")} />}
            >
              {!isRemote && (
                <input
                  className={inputCls}
                  placeholder={t("wizard.cityPlaceholder")}
                  value={draft.city}
                  onChange={(e) => set({ city: e.target.value })}
                />
              )}
            </Field>
            <Field label={t("wizard.birthDateLabel")} hint={t("wizard.birthDateHint")}>
              <input
                type="date"
                className={inputCls}
                value={draft.birthDate || ""}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => set({ birthDate: e.target.value })}
              />
            </Field>
          </>
        )}

        {step === 2 && <ExperienceStep draft={draft} set={set} t={t} registerFlush={registerFlush} />}
        {step === 3 && <EducationStep draft={draft} set={set} t={t} registerFlush={registerFlush} />}
        {step === 4 && <SkillsStep draft={draft} set={set} t={t} />}
        {step === 5 && <PortfolioStep draft={draft} set={set} t={t} registerFlush={registerFlush} />}
      </div>

      <div className="px-6 pb-6 pt-2">
        <button
          onClick={next}
          disabled={!canNext()}
          className="tap w-full flex items-center justify-center gap-2 bg-accent-500 disabled:bg-base-700 disabled:text-white/30 text-base-950 font-semibold text-sm rounded-xl py-3.5"
        >
          {step < TOTAL_STEPS - 1 ? t("common.next") : t("wizard.chooseTemplate")}
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

function ExperienceStep({ draft, set, t, registerFlush }) {
  const [item, setItem] = useState({ company: "", position: "", period: "", description: "" });

  const add = () => {
    if (!item.company.trim() || !item.position.trim()) return;
    set({ experience: listAdd(draft.experience, item) });
    setItem({ company: "", position: "", period: "", description: "" });
  };
  const remove = (id) => set({ experience: draft.experience.filter((x) => x.id !== id) });

  // Реєструємо для батька функцію, яка на "Далі"/"Назад" сама додасть цей
  // запис, якщо юзер заповнив обов'язкові поля, але забув натиснути "Додати".
  useEffect(() => {
    registerFlush?.(() => {
      if (item.company.trim() && item.position.trim()) add();
    });
  });

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
              {t("common.delete")}
            </button>
          </div>
        </div>
      ))}

      <Field label={t("vacancy.company")}>
        <input className={inputCls} placeholder={t("wizard.companyPlaceholder")} value={item.company}
          onChange={(e) => setItem({ ...item, company: e.target.value })} />
      </Field>
      <Field label={t("vacancy.position")}>
        <input className={inputCls} placeholder={t("wizard.rolePlaceholder")} value={item.position}
          onChange={(e) => setItem({ ...item, position: e.target.value })} />
      </Field>
      <Field label={t("wizard.periodLabel")}>
        <input className={inputCls} placeholder={t("wizard.periodPlaceholderExp")} value={item.period}
          onChange={(e) => setItem({ ...item, period: e.target.value })} />
      </Field>
      <Field label={t("wizard.dutiesLabel")}>
        <textarea className={inputCls + " min-h-[90px] resize-none"} placeholder={t("wizard.dutiesPlaceholder")}
          value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} />
      </Field>
      <button onClick={add} className="tap w-full border border-dashed border-accent-500/50 text-accent-300 text-sm font-medium rounded-xl py-2.5">
        {t("wizard.addExperience")}
      </button>
    </div>
  );
}

function EducationStep({ draft, set, t, registerFlush }) {
  const [item, setItem] = useState({ school: "", degree: "", period: "" });

  const add = () => {
    if (!item.school.trim()) return;
    set({ education: listAdd(draft.education, item) });
    setItem({ school: "", degree: "", period: "" });
  };
  const remove = (id) => set({ education: draft.education.filter((x) => x.id !== id) });

  useEffect(() => {
    registerFlush?.(() => {
      if (item.school.trim()) add();
    });
  });

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
              {t("common.delete")}
            </button>
          </div>
        </div>
      ))}

      <Field label={t("wizard.schoolLabel")}>
        <input className={inputCls} placeholder={t("wizard.schoolPlaceholder")} value={item.school}
          onChange={(e) => setItem({ ...item, school: e.target.value })} />
      </Field>
      <Field label={t("wizard.degreeLabel")}>
        <input className={inputCls} placeholder={t("wizard.degreePlaceholder")} value={item.degree}
          onChange={(e) => setItem({ ...item, degree: e.target.value })} />
      </Field>
      <Field label={t("wizard.periodLabel")}>
        <input className={inputCls} placeholder={t("wizard.periodPlaceholderEdu")} value={item.period}
          onChange={(e) => setItem({ ...item, period: e.target.value })} />
      </Field>
      <button onClick={add} className="tap w-full border border-dashed border-accent-500/50 text-accent-300 text-sm font-medium rounded-xl py-2.5">
        {t("wizard.addEducation")}
      </button>
    </div>
  );
}

export function detectMediaType(url) {
  if (!url) return null;
  const u = url.trim();
  if (/\.(png|jpe?g|webp|svg)(\?.*)?$/i.test(u)) return "image";
  if (/\.(gif)(\?.*)?$/i.test(u)) return "gif";
  if (/giphy\.com\/(gifs|embed)\//i.test(u)) return "gif";
  if (/\.(pdf)(\?.*)?$/i.test(u)) return "pdf";
  if (/\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(u)) return "video";
  if (/\.(mp3|wav|m4a|aac|flac|opus|wma|oga)(\?.*)?$/i.test(u)) return "audio";
  if (/soundcloud\.com\//i.test(u)) return "soundcloud";
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

function PortfolioStep({ draft, set, t, registerFlush }) {
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

  useEffect(() => {
    registerFlush?.(() => {
      if (item.url.trim()) add();
    });
  });

  return (
    <div>
      {portfolio.map((p) => (
        <div key={p.id} className="bg-base-850 border border-base-700 rounded-xl p-3 mb-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="font-medium text-sm truncate">{p.title || t("wizard.untitled")}</p>
            <button onClick={() => remove(p.id)} className="tap shrink-0 text-white/30 hover:text-red-400 text-xs">
              {t("common.delete")}
            </button>
          </div>
          <p className="text-xs text-white/40 truncate mb-2">{p.url}</p>
          <MediaPreview item={p} />
        </div>
      ))}

      <Field label={t("wizard.portfolioTitleLabel")} hint={t("wizard.portfolioTitleHint")}>
        <input
          className={inputCls}
          placeholder={t("wizard.portfolioTitlePlaceholder")}
          value={item.title}
          onChange={(e) => setItem({ ...item, title: e.target.value })}
        />
      </Field>
      <Field
        label={t("wizard.portfolioUrlLabel")}
        hint={t("wizard.portfolioUrlHint")}
      >
        <input
          className={inputCls}
          placeholder={t("wizard.portfolioUrlPlaceholder")}
          value={item.url}
          onChange={(e) => setItem({ ...item, url: e.target.value })}
        />
      </Field>
      <button onClick={add} className="tap w-full border border-dashed border-accent-500/50 text-accent-300 text-sm font-medium rounded-xl py-2.5">
        {t("wizard.addPortfolio")}
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
  map: {
    label: "Google Maps",
    bg: "#34A853",
    fg: "#ffffff",
    icon: (
      <path d="M12 2C7.6 2 4 5.6 4 10c0 5.6 7 11.5 7.3 11.7.2.2.5.3.7.3s.5-.1.7-.3C13 21.5 20 15.6 20 10c0-4.4-3.6-8-8-8zm0 10.8a2.8 2.8 0 110-5.6 2.8 2.8 0 010 5.6z" />
    ),
  },
  gdoc: {
    label: "Google Docs",
    bg: "#4285F4",
    fg: "#ffffff",
    icon: (
      <path d="M14 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V8l-5-6zm0 1.5L18.5 8H15a1 1 0 01-1-1V3.5zM8 13h8v1.5H8V13zm0 3h8v1.5H8V16zm0-6h5v1.5H8V10z" />
    ),
  },
};

function SocialButton({ type, url, title }) {
  const { t } = useLanguage();
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
        <p className="text-xs opacity-80">{t("media.openIn")(s.label)}</p>
      </div>
      <svg width="14" height="14" viewBox="0 0 15 15" fill="none" className="ml-auto shrink-0">
        <path d="M5 3l5 4.5L5 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}

const APP_STORE_META_KEYS = { googleplay: "media.googleplay", appstore: "media.appstore" };

// Google Play / App Store не віддають щось зручне для одразу-embed, тому
// показуємо картку застосунку: іконка + назва, підтягнуті з og:-тегів
// сторінки через наш бекенд (/api/link-preview, щоб обійти CORS). Поки
// йде запит — показуємо скелетон-прелоадер; якщо не вдалось (немає
// мережі, застосунок видалений тощо) — падаємо назад на просту кнопку.
function AppStoreCard({ type, url, title }) {
  const { t } = useLanguage();
  const label = t(APP_STORE_META_KEYS[type]);
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
      style={{ background: "#000000", color: "#ffffff" }}
    >
      {!state.failed && state.image && (
        <img
          src={state.image}
          alt=""
          crossOrigin="anonymous"
          data-pdf-hide="true"
          className="w-11 h-11 rounded-xl object-cover shrink-0 bg-white"
        />
      )}
      <div
        className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0"
        style={!state.failed && state.image ? { display: "none" } : undefined}
        data-pdf-only={!state.failed && state.image ? "true" : undefined}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          {type === "googleplay" ? (
            <path d="M4.5 3.5c-.3.3-.5.7-.5 1.2v14.6c0 .5.2.9.5 1.2l8.4-8.5L4.5 3.5zM14 12l2.4-2.4L6.1 3.7c-.3-.2-.7-.3-1-.2L14 12zm0 0l-8.9 8.5c.3.1.7 0 1-.2l10.3-5.9L14 12zm3.4-3.4L15 12l2.4 3.4 3-1.7c.8-.5.8-1.7 0-2.1l-3-1.7z" />
          ) : (
            <path d="M16.5 1.5c.1 1.1-.3 2.2-1 3-.7.8-1.9 1.5-3 1.4-.1-1.1.4-2.2 1-3 .8-.9 2-1.5 3-1.4zm3.4 15.9c-.5 1.1-.7 1.6-1.3 2.6-.9 1.4-2.2 3.1-3.7 3.1-1.4 0-1.7-.9-3.6-.9-1.9 0-2.3.9-3.6.9-1.5 0-2.7-1.6-3.6-3-2.5-3.8-2.8-8.3-1.2-10.7 1.1-1.7 2.9-2.7 4.5-2.7 1.7 0 2.7 1 4.1 1s2.2-1 4.1-.9c1.4.1 2.9.6 3.9 2-2.4 1.5-2.1 5.1.4 6.9-.4 1-.6 1.4-1 1.7z" />
          )}
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">{title || state.title || label}</p>
        <p className="text-xs opacity-80" data-pdf-export-hide="true">{label}</p>
      </div>
      <svg width="14" height="14" viewBox="0 0 15 15" fill="none" className="ml-auto shrink-0">
        <path d="M5 3l5 4.5L5 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}

function youtubeThumb(id) {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}
function vimeoThumb(id) {
  // Публічний безкоштовний проксі-сервіс для обкладинок Vimeo за ID
  // відео без потреби ходити в oEmbed API з бекенду.
  return `https://vumbnail.com/${id}.jpg`;
}

// Живі iframe (YouTube/Vimeo/Figma/PDF-перегляд) чудово працюють у
// звичайному перегляді, але html2canvas (наш генератор PDF) не вміє їх
// знімати — сторонній iframe або лишає порожнє місце, або взагалі кидає
// помилку (SecurityError) і ламає весь PDF. Тому для таких елементів
// рендеримо ОДРАЗУ два варіанти в DOM: "живий" (iframe) і статичний
// "для PDF" (картинка-прев'ю + посилання). pdf.js на час знімку міняє їх
// видимість місцями через ці атрибути.
function PdfSwap({ live, fallback }) {
  return (
    <>
      <div data-pdf-hide="true">{live}</div>
      <div data-pdf-only="true" style={{ display: "none" }}>
        {fallback}
      </div>
    </>
  );
}

// Картки-заглушки нижче використовуються як "fallback" для PDF (через
// data-pdf-only) — сам <video>/<audio>/iframe html2canvas коректно не
// знімає. Клікабельність тепер забезпечує не текстове посилання всередині
// картки, а прозорий оверлей поверх усієї картки, який pdf.js додає
// окремо (через data-pdf-link на обгортці MediaPreview) — тому в самих
// картках жодного видимого URL більше немає.

// Статична картка-заглушка для відео (YouTube/Vimeo) у PDF: обкладинка
// відео + кнопка Play поверх.
function VideoPdfCard({ thumbUrl }) {
  return (
    <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
      {thumbUrl && <img src={thumbUrl} alt="" crossOrigin="anonymous" className="w-full h-full object-cover" />}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// Статична картка-заглушка для аудіо (файл або SoundCloud) у PDF:
// іконка ноти + назва.
function AudioPdfCard({ title }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-3 rounded-xl px-4 py-3 bg-base-800 border border-base-700">
      <div className="w-11 h-11 rounded-xl bg-accent-500/15 flex items-center justify-center shrink-0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-accent-400">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">{title || t("media.audio")}</p>
      </div>
    </div>
  );
}

// Багато сайтів забороняють вбудовування через X-Frame-Options / CSP
// frame-ancestors — у такому разі iframe просто лишається порожнім, без
// жодної JS-помилки, яку можна відловити. Тому над iframe завжди
// лишаємо міні-шапку (іконка/назва сайту + кнопка "Відкрити"), щоб
// користувач міг перейти на сторінку, навіть якщо прев'ю не завантажилось.
// Деякі сайти (напр. apostol-space.tech) — це не звичайні лендінги, а
// одна сторінка-плеєр: увесь її "контент" — це вузька панель з аудіо, а
// решта — порожній чорний фон. Показувати таку сторінку в стандартному
// 220px iframe = здебільшого чорний прямокутник над маленьким плеєром.
// Для відомих хостів такого типу підвантажуємо ту саму сторінку, але в
// значно нижчому iframe — рівно під розмір плеєра.
const COMPACT_EMBED_HOSTS = [/(^|\.)apostol-space\.tech$/i];

function isCompactEmbedHost(hostname) {
  return COMPACT_EMBED_HOSTS.some((re) => re.test(hostname));
}

function WebsiteFrame({ url, title }) {
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

  const openSite = () => {
    const tg = getTelegramWebApp();
    if (tg?.openLink) tg.openLink(url);
    else window.open(url, "_blank");
  };

  let hostname = url;
  try {
    hostname = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // залишаємо url як є, якщо не спарсився
  }

  return (
    <div className="rounded-xl overflow-hidden border border-base-700 bg-base-800">
      <button onClick={openSite} className="tap w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-base-700">
        {!state.loading && !state.failed && state.image ? (
          <img src={state.image} alt="" crossOrigin="anonymous" className="w-7 h-7 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3c2.5 2.7 4 6 4 9s-1.5 6.3-4 9c-2.5-2.7-4-6-4-9s1.5-6.3 4-9z" />
            </svg>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold truncate text-white/90">{title || state.title || hostname}</p>
          <p className="text-[10px] text-white/40 truncate">{hostname}</p>
        </div>
        <svg width="12" height="12" viewBox="0 0 15 15" fill="none" className="ml-auto shrink-0 text-white/40">
          <path d="M5 3l5 4.5L5 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <iframe
        src={url}
        title={title || hostname}
        className="w-full bg-white"
        style={{ height: isCompactEmbedHost(hostname) ? 90 : 220, border: 0 }}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        loading="lazy"
      />
    </div>
  );
}

function WebsiteCard({ url, title }) {
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

  const openSite = () => {
    const tg = getTelegramWebApp();
    if (tg?.openLink) tg.openLink(url);
    else window.open(url, "_blank");
  };

  let hostname = url;
  try {
    hostname = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // залишаємо url як є, якщо не спарсився
  }

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
    <button
      onClick={openSite}
      className="tap w-full flex items-center gap-3 rounded-xl px-4 py-3 bg-base-800 border border-base-700 text-left"
    >
      {!state.failed && state.image ? (
        <img src={state.image} alt="" crossOrigin="anonymous" className="w-11 h-11 rounded-xl object-cover shrink-0" />
      ) : (
        <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.5 2.7 4 6 4 9s-1.5 6.3-4 9c-2.5-2.7-4-6-4-9s1.5-6.3 4-9z" />
          </svg>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate text-white/90">{title || state.title || hostname}</p>
        <p className="text-xs text-white/40 truncate">{hostname}</p>
      </div>
      <svg width="14" height="14" viewBox="0 0 15 15" fill="none" className="ml-auto shrink-0 text-white/40">
        <path d="M5 3l5 4.5L5 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

// Рендерить конкретне прев'ю за типом. Обгортка MediaPreview нижче додає
// навколо результату контейнер з data-pdf-link, щоб під час генерації
// PDF (html2canvas + jsPDF) на всю картку можна було накласти невидиме
// клікабельне посилання — без показу самого URL текстом.
function renderMediaPreviewContent(item) {
  const type = item.type || detectMediaType(item.url);
  if (type === "youtube") {
    const id = youtubeId(item.url);
    if (!id) return null;
    return (
      <PdfSwap
        live={
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
        }
        fallback={<VideoPdfCard thumbUrl={youtubeThumb(id)} />}
      />
    );
  }
  if (type === "vimeo") {
    const id = vimeoId(item.url);
    if (!id) return null;
    return (
      <PdfSwap
        live={
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
        }
        fallback={<VideoPdfCard thumbUrl={vimeoThumb(id)} />}
      />
    );
  }
  if (type === "video") {
    return (
      <PdfSwap
        live={<video src={item.url} controls crossOrigin="anonymous" className="w-full rounded-lg bg-black" style={{ maxHeight: 220 }} />}
        fallback={<VideoPdfCard thumbUrl={null} />}
      />
    );
  }
  if (type === "audio") {
    return (
      <PdfSwap
        live={
          <div className="w-full rounded-xl bg-base-800 border border-base-700 px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-500/15 flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-accent-400">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <audio src={item.url} controls className="flex-1 min-w-0 h-9" style={{ maxWidth: "100%" }} />
          </div>
        }
        fallback={<AudioPdfCard title={item.title} />}
      />
    );
  }
  if (type === "soundcloud") {
    return (
      <PdfSwap
        live={
          <iframe
            src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(item.url)}&color=%23ff7a00&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=false`}
            title={item.title || "soundcloud"}
            className="w-full rounded-lg"
            style={{ height: 166, border: 0 }}
            allow="autoplay"
          />
        }
        fallback={<AudioPdfCard title={item.title} />}
      />
    );
  }
  if (type === "gif") {
    return <img src={normalizeMediaUrl(item.url)} alt={item.title || "gif"} className="w-full rounded-lg object-cover" style={{ maxHeight: 220 }} />;
  }
  if (type === "image") {
    return <img src={normalizeMediaUrl(item.url)} alt={item.title || "image"} className="w-full rounded-lg object-cover" style={{ maxHeight: 320 }} />;
  }
  if (type === "pdf") {
    return (
      <PdfSwap
        live={
          <iframe
            src={item.url}
            title={item.title || "pdf"}
            className="w-full rounded-lg bg-white"
            style={{ height: 400 }}
          />
        }
        fallback={
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 bg-base-800 border border-base-700">
            <div className="w-11 h-11 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#ef4444">
                <path d="M6 2h9l5 5v15a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2zm8 1.5V8h4.5L14 3.5z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{item.title || "PDF"}</p>
            </div>
          </div>
        }
      />
    );
  }
  if (type === "tiktok" || type === "instagram" || type === "threads" || type === "telegram" || type === "olx" || type === "viber" || type === "whatsapp" || type === "map") {
    return <SocialButton type={type} url={item.url} title={item.title} />;
  }
  if (type === "gdoc") {
    const docIdMatch = item.url.match(/document\/d\/([a-zA-Z0-9_-]+)/);
    const docId = docIdMatch ? docIdMatch[1] : null;
    if (!docId) return <SocialButton type="gdoc" url={item.url} title={item.title} />;
    return (
      <PdfSwap
        live={
          <iframe
            src={`https://docs.google.com/document/d/${docId}/preview`}
            title={item.title || "Google Doc"}
            className="w-full rounded-lg bg-white"
            style={{ height: 400, border: 0 }}
          />
        }
        fallback={<SocialButton type="gdoc" url={item.url} title={item.title} />}
      />
    );
  }
  if (type === "googleplay" || type === "appstore") {
    return <AppStoreCard type={type} url={item.url} title={item.title} />;
  }
  if (type === "figma") {
    return (
      <PdfSwap
        live={
          <iframe
            src={`https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(item.url)}`}
            title={item.title || "figma"}
            className="w-full rounded-lg bg-white"
            style={{ height: 360, border: 0 }}
            allowFullScreen
          />
        }
        fallback={
          <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "#1e1e1e", color: "#ffffff" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
              <path d="M8 24a4 4 0 004-4v-4H8a4 4 0 000 8zM4 12a4 4 0 014-4h4v8H8a4 4 0 01-4-4zm0-8a4 4 0 014-4h4v8H8a4 4 0 01-4-4zm9-4h4a4 4 0 010 8h-4V0zm4 12a4 4 0 11-4 4v-4h4z" />
            </svg>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{item.title || "Figma"}</p>
            </div>
          </div>
        }
      />
    );
  }
  return (
    <PdfSwap
      live={<WebsiteFrame url={item.url} title={item.title} />}
      fallback={<WebsiteCard url={item.url} title={item.title} />}
    />
  );
}

export function MediaPreview({ item }) {
  const content = renderMediaPreviewContent(item);
  if (!content) return null;
  // data-pdf-link зчитує pdf.js під час експорту: поверх усього прямокутника
  // цієї картки в готовому PDF буде накладено клікабельне посилання на
  // item.url — без будь-якого видимого тексту URL.
  return <div data-pdf-link={item.url}>{content}</div>;
}

function SkillsStep({ draft, set, t }) {
  return (
    <div>
      <Field label={t("resume.sections.skills")} hint={t("wizard.skillsHint")}>
        <TagPicker
          value={draft.skills}
          onChange={(skills) => set({ skills })}
          placeholder={t("wizard.skillsPlaceholder")}
          addLabel={t("common.addTag")}
          moreLabel={t("common.showMoreTags")}
          lessLabel={t("common.showLessTags")}
        />
      </Field>
    </div>
  );
}
