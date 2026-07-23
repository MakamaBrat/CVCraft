import { useState } from "react";
import TagPicker from "../components/TagPicker.jsx";
import { MediaPreview, detectMediaType } from "./Wizard.jsx";
import { useLanguage } from "../lib/i18n/index.jsx";
import { confirmDialog } from "../lib/telegram.js";

const TOTAL_STEPS = 4;

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

export default function VacancyWizard({ draft, setDraft, step, setStep, onBackHome, onFinishInfo }) {
  const { lang } = useLanguage();
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const titles = {
    uk: ["Посада", "Деталі", "Опис", "Контакт і медіа"],
    ru: ["Должность", "Детали", "Описание", "Контакт и медиа"],
    en: ["Position", "Details", "Description", "Contact & media"],
  }[lang];

  const nextLabel = { uk: "Далі", ru: "Далее", en: "Next" }[lang];
  const finalLabel = { uk: "Обрати шаблон", ru: "Выбрать шаблон", en: "Choose template" }[lang];

  const canNext = () => {
    if (step === 0) return draft.position.trim() && draft.company.trim();
    if (step === 2) return draft.description.trim();
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
      draft.position?.trim() ||
        draft.company?.trim() ||
        draft.salary?.trim() ||
        draft.city?.trim() ||
        draft.description?.trim() ||
        draft.requirements?.trim() ||
        draft.contact?.trim() ||
        (draft.tags || []).length > 0 ||
        (draft.media || []).length > 0
    );

  const exitConfirmText = {
    uk: "Вийти без збереження? Введені дані буде втрачено.",
    ru: "Выйти без сохранения? Введённые данные будут потеряны.",
    en: "Leave without saving? Entered data will be lost.",
  }[lang];

  const goHome = async () => {
    if (isDirty() && !(await confirmDialog(exitConfirmText))) return;
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
            {step + 1}/{TOTAL_STEPS}
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
        <h1 className="text-xl font-bold mb-5">{titles[step]}</h1>

        {step === 0 && (
          <>
            <Field label={{ uk: "Назва посади", ru: "Название должности", en: "Job title" }[lang]}>
              <input
                className={inputCls}
                placeholder={{ uk: "Наприклад, Менеджер з продажу", ru: "Например, Менеджер по продажам", en: "e.g. Sales Manager" }[lang]}
                value={draft.position}
                onChange={(e) => set({ position: e.target.value })}
              />
            </Field>
            <Field label={{ uk: "Компанія", ru: "Компания", en: "Company" }[lang]}>
              <input
                className={inputCls}
                placeholder={{ uk: "Назва компанії", ru: "Название компании", en: "Company name" }[lang]}
                value={draft.company}
                onChange={(e) => set({ company: e.target.value })}
              />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <Field label={{ uk: "Зарплата", ru: "Зарплата", en: "Salary" }[lang]}>
              <input
                className={inputCls}
                placeholder="$1500–2500"
                value={draft.salary}
                onChange={(e) => set({ salary: e.target.value })}
              />
            </Field>
            <Field label={{ uk: "Місто", ru: "Город", en: "City" }[lang]}>
              <input
                className={inputCls}
                placeholder="Київ / Remote"
                value={draft.city}
                onChange={(e) => set({ city: e.target.value })}
              />
            </Field>
            <Field label={{ uk: "Тип зайнятості", ru: "Тип занятости", en: "Employment type" }[lang]}>
              <input
                className={inputCls}
                placeholder={{ uk: "Повна зайнятість", ru: "Полная занятость", en: "Full-time" }[lang]}
                value={draft.employmentType}
                onChange={(e) => set({ employmentType: e.target.value })}
              />
            </Field>
            <Field
              label={{ uk: "Теги", ru: "Теги", en: "Tags" }[lang]}
              hint={{
                uk: "Клікайте на теги зі списку або впишіть свій. За тегами кандидати фільтруватимуть вакансії.",
                ru: "Кликайте на теги из списка или впишите свой. По тегам кандидаты будут фильтровать вакансии.",
                en: "Click tags from the list or type your own. Candidates will filter job posts by tags.",
              }[lang]}
            >
              <TagPicker
                value={draft.tags || []}
                onChange={(tags) => set({ tags })}
                placeholder={{ uk: "Свій тег", ru: "Свой тег", en: "Custom tag" }[lang]}
                addLabel={{ uk: "Додати", ru: "Добавить", en: "Add" }[lang]}
                moreLabel={{ uk: "Показати ще", ru: "Показать ещё", en: "Show more" }[lang]}
                lessLabel={{ uk: "Згорнути", ru: "Свернуть", en: "Show less" }[lang]}
              />
            </Field>

            <button
              type="button"
              onClick={() => set({ requireResume: !draft.requireResume })}
              className="tap w-full flex items-start gap-3 bg-base-850 border border-base-700 rounded-xl px-4 py-3 text-left mb-2"
            >
              <span
                className={`shrink-0 mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                  draft.requireResume ? "bg-accent-500 border-accent-500" : "border-base-600"
                }`}
              >
                {draft.requireResume && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-6" stroke="#0a0a0a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span>
                <span className="block text-sm font-medium text-white/85">
                  {{ uk: "Приймати відгуки тільки з резюме", ru: "Принимать отклики только с резюме", en: "Only accept applicants with a resume" }[lang]}
                </span>
                <span className="block text-xs text-white/40 mt-0.5">
                  {
                    {
                      uk: "Якщо вимкнено — відгукнутися зможе будь-хто, навіть без резюме.",
                      ru: "Если выключено — откликнуться сможет любой, даже без резюме.",
                      en: "If off, anyone can apply, even without a resume.",
                    }[lang]
                  }
                </span>
              </span>
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <Field label={{ uk: "Опис вакансії", ru: "Описание вакансии", en: "Job description" }[lang]}>
              <textarea
                className={inputCls + " min-h-[120px] resize-none"}
                placeholder={{
                  uk: "Чим займатиметься людина, над якими проєктами...",
                  ru: "Чем будет заниматься человек, над какими проектами...",
                  en: "What the person will work on, which projects...",
                }[lang]}
                value={draft.description}
                onChange={(e) => set({ description: e.target.value })}
              />
            </Field>
            <Field label={{ uk: "Вимоги", ru: "Требования", en: "Requirements" }[lang]}>
              <textarea
                className={inputCls + " min-h-[100px] resize-none"}
                placeholder={{
                  uk: "Навички, досвід, освіта...",
                  ru: "Навыки, опыт, образование...",
                  en: "Skills, experience, education...",
                }[lang]}
                value={draft.requirements}
                onChange={(e) => set({ requirements: e.target.value })}
              />
            </Field>
          </>
        )}

        {step === 3 && <ContactMediaStep draft={draft} set={set} lang={lang} />}
      </div>

      <div className="px-6 pb-6 pt-2">
        <button
          onClick={next}
          disabled={!canNext()}
          className="tap w-full flex items-center justify-center gap-2 bg-accent-500 disabled:bg-base-700 disabled:text-white/30 text-base-950 font-semibold text-sm rounded-xl py-3.5"
        >
          {step < TOTAL_STEPS - 1 ? nextLabel : finalLabel}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ContactMediaStep({ draft, set, lang }) {
  const [item, setItem] = useState({ title: "", url: "" });
  const media = draft.media || [];

  const add = () => {
    if (!item.url.trim()) return;
    set({
      media: [
        ...media,
        { id: crypto.randomUUID(), title: item.title.trim(), url: item.url.trim(), type: detectMediaType(item.url) },
      ],
    });
    setItem({ title: "", url: "" });
  };
  const remove = (id) => set({ media: media.filter((x) => x.id !== id) });

  return (
    <div>
      <Field
        label={{ uk: "Юзернейм у Telegram для відгуків", ru: "Юзернейм в Telegram для откликов", en: "Telegram username for applicants" }[lang]}
      >
        <input
          className={inputCls}
          placeholder="@company_hr"
          value={draft.contact}
          onChange={(e) => {
            let v = e.target.value.replace(/\s/g, "");
            if (v && !v.startsWith("@")) v = "@" + v;
            set({ contact: v });
          }}
        />
      </Field>

      {media.map((p) => (
        <div key={p.id} className="bg-base-850 border border-base-700 rounded-xl p-3 mb-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="font-medium text-sm truncate">{p.title || "—"}</p>
            <button onClick={() => remove(p.id)} className="tap shrink-0 text-white/30 hover:text-red-400 text-xs">
              {{ uk: "Видалити", ru: "Удалить", en: "Delete" }[lang]}
            </button>
          </div>
          <p className="text-xs text-white/40 truncate mb-2">{p.url}</p>
          <MediaPreview item={p} />
        </div>
      ))}

      <Field
        label={{ uk: "Приклад про компанію (необов'язково)", ru: "Пример о компании (необязательно)", en: "Example about the company (optional)" }[lang]}
        hint="Відео, соцмережі, гіф, файли, застосунки, карти і т.д."
      >
        <input
          className={inputCls}
          placeholder="https://..."
          value={item.url}
          onChange={(e) => setItem({ ...item, url: e.target.value })}
        />
      </Field>
      <button onClick={add} className="tap w-full border border-dashed border-accent-500/50 text-accent-300 text-sm font-medium rounded-xl py-2.5">
        + {{ uk: "Додати медіа", ru: "Добавить медиа", en: "Add media" }[lang]}
      </button>
    </div>
  );
}
