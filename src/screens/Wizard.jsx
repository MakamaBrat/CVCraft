import { useState, useEffect, useRef } from "react";
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
  if (/tiktok\.com\//i.test(u)) return "tiktok";
  if (/instagram\.com\/(p|reel|reels)\//i.test(u)) return "instagram";
  if (/figma\.com\/(file|design|proto)\//i.test(u)) return "figma";
  if (/google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(u)) return "map";
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
        hint="YouTube, Vimeo, TikTok, Instagram, Figma, Google Maps, пряме посилання на .mp4, .gif або .pdf."
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
// Прямі iframe-посилання виду tiktok.com/embed/v2/... та
// instagram.com/p/.../embed платформи давно закрили для сторонніх
// сайтів. Єдиний офіційний і робочий спосіб — той самий <blockquote> +
// зовнішній embed.js, який використовує кнопка "Поділитися → Вбудувати"
// на самих TikTok/Instagram. Скрипт сам знаходить блоки на сторінці й
// підміняє їх на iframe з постом.
function loadEmbedScript(src, readyFlag) {
  return new Promise((resolve) => {
    if (window[readyFlag]) return resolve();
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      window[readyFlag] = true;
      resolve();
    };
    document.body.appendChild(script);
  });
}

function tiktokId(url) {
  const m = url.match(/video\/(\d+)/);
  return m ? m[1] : null;
}

function TikTokEmbed({ url, title }) {
  const ref = useRef(null);
  useEffect(() => {
    // На відміну від Instagram, у TikTok немає публічного API для
    // повторної обробки нових блоків — скрипт сканує сторінку лише під
    // час свого виконання. Тому для карток, доданих пізніше (React),
    // додаємо свіжий тег скрипта щоразу; сам TikTok ігнорує вже
    // відрендерені блоки, тому дублі нешкідливі.
    const s = document.createElement("script");
    s.src = "https://www.tiktok.com/embed.js";
    s.async = true;
    document.body.appendChild(s);
    return () => {
      s.remove();
    };
  }, [url]);

  return (
    <blockquote
      ref={ref}
      className="tiktok-embed"
      cite={url}
      data-video-id={tiktokId(url)}
      style={{ maxWidth: 400, minWidth: 260, margin: "0 auto" }}
    >
      <section>
        <a target="_blank" rel="noreferrer" href={url}>
          {title || "TikTok"}
        </a>
      </section>
    </blockquote>
  );
}

function InstagramEmbed({ url, title }) {
  useEffect(() => {
    let cancelled = false;
    loadEmbedScript("https://www.instagram.com/embed.js", "__instagramEmbedLoaded").then(() => {
      if (cancelled) return;
      if (window.instgrm?.Embeds?.process) window.instgrm.Embeds.process();
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <blockquote
      className="instagram-media"
      data-instgrm-permalink={url}
      data-instgrm-version="14"
      style={{ maxWidth: 400, minWidth: 260, margin: "0 auto" }}
    >
      <a target="_blank" rel="noreferrer" href={url}>
        {title || "Instagram"}
      </a>
    </blockquote>
  );
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
  if (type === "tiktok") {
    if (!tiktokId(item.url)) {
      return (
        <a href={item.url} target="_blank" rel="noreferrer" className="text-xs text-accent-300 underline break-all">
          {item.url}
        </a>
      );
    }
    return <TikTokEmbed url={item.url} title={item.title} />;
  }
  if (type === "instagram") {
    if (!/instagram\.com\/(p|reel|reels)\/[a-zA-Z0-9_-]+/i.test(item.url)) {
      return (
        <a href={item.url} target="_blank" rel="noreferrer" className="text-xs text-accent-300 underline break-all">
          {item.url}
        </a>
      );
    }
    return <InstagramEmbed url={item.url} title={item.title} />;
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
