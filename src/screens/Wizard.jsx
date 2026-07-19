import { useState } from "react";
import StatusBar from "../components/StatusBar.jsx";

const TOTAL_STEPS = 5;
const STEP_TITLES = ["Основне", "Контакти", "Досвід", "Освіта", "Навички"];

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
  "w-full bg-base-850 border border-base-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-violet-500 transition-colors";

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

  return (
    <div className="flex-1 flex flex-col bg-base-950">
      <StatusBar />

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
        </div>
        <div className="h-1.5 bg-base-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all duration-300"
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
            <Field label="Телефон">
              <input
                className={inputCls}
                placeholder="+380 63 123 45 67"
                value={draft.phone}
                onChange={(e) => set({ phone: e.target.value })}
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
      </div>

      <div className="px-6 pb-6 pt-2">
        <button
          onClick={next}
          disabled={!canNext()}
          className="tap w-full flex items-center justify-center gap-2 bg-violet-500 disabled:bg-base-700 disabled:text-white/30 text-white font-semibold text-sm rounded-xl py-3.5"
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
      <button onClick={add} className="tap w-full border border-dashed border-violet-500/50 text-violet-300 text-sm font-medium rounded-xl py-2.5">
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
      <button onClick={add} className="tap w-full border border-dashed border-violet-500/50 text-violet-300 text-sm font-medium rounded-xl py-2.5">
        + Додати освіту
      </button>
    </div>
  );
}

function SkillsStep({ draft, set }) {
  const [val, setVal] = useState("");
  const add = () => {
    const v = val.trim();
    if (!v || draft.skills.includes(v)) return;
    set({ skills: [...draft.skills, v] });
    setVal("");
  };
  const remove = (s) => set({ skills: draft.skills.filter((x) => x !== s) });

  return (
    <div>
      <Field label="Навички" hint="Натисніть Enter, щоб додати навичку.">
        <div className="flex gap-2">
          <input
            className={inputCls}
            placeholder="Unity, C#, Git..."
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          />
          <button onClick={add} className="tap shrink-0 bg-base-800 border border-base-700 rounded-xl px-4 text-sm font-medium">
            Додати
          </button>
        </div>
      </Field>
      <div className="flex flex-wrap gap-2">
        {draft.skills.map((s) => (
          <span key={s} className="flex items-center gap-1.5 bg-violet-500/15 text-violet-300 text-xs font-medium rounded-full pl-3 pr-2 py-1.5">
            {s}
            <button onClick={() => remove(s)} className="tap text-violet-300/60 hover:text-violet-200">
              ✕
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
