import { useState } from "react";
import { CATEGORY_ORDER, TAG_CATEGORIES } from "../lib/tags.js";
import { useLanguage } from "../lib/i18n/index.jsx";

/**
 * Клікабельний вибір тегів: спершу список сфер (категорій), клік по сфері
 * розкриває групу тегів саме з неї + можливість ввести свій тег.
 * value: string[] — обрані теги
 * onChange: (nextTags: string[]) => void
 */
export default function TagPicker({ value = [], onChange, placeholder, addLabel }) {
  const { lang } = useLanguage();
  const [val, setVal] = useState("");
  const [openCategory, setOpenCategory] = useState(null);
  const categories = TAG_CATEGORIES[lang] || TAG_CATEGORIES.en;

  const add = (tag) => {
    const v = tag.trim();
    if (!v || value.includes(v)) return;
    onChange([...value, v]);
  };
  const remove = (tag) => onChange(value.filter((x) => x !== tag));
  const toggle = (tag) => (value.includes(tag) ? remove(tag) : add(tag));

  const submitCustom = () => {
    add(val);
    setVal("");
  };

  const toggleCategory = (id) => setOpenCategory((cur) => (cur === id ? null : id));

  return (
    <div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {value.map((s) => (
            <span
              key={s}
              className="flex items-center gap-1.5 bg-accent-500/15 text-accent-300 text-xs font-medium rounded-full pl-3 pr-2 py-1.5"
            >
              {s}
              <button onClick={() => remove(s)} className="tap text-accent-300/60 hover:text-accent-200">
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-3">
        <input
          className="w-full bg-base-850 border border-base-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-accent-500 transition-colors"
          placeholder={placeholder}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), submitCustom())}
        />
        <button
          onClick={submitCustom}
          className="tap shrink-0 bg-base-800 border border-base-700 rounded-xl px-4 text-sm font-medium"
        >
          {addLabel}
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        {CATEGORY_ORDER.map((id) => {
          const cat = categories[id];
          const isOpen = openCategory === id;
          const availableTags = cat.tags.filter((tg) => !value.includes(tg));
          return (
            <div key={id} className="border border-base-700 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleCategory(id)}
                className="tap w-full flex items-center justify-between gap-2 bg-base-850 px-4 py-2.5 text-left text-xs font-medium text-white/80 hover:text-white"
              >
                <span>{cat.label}</span>
                <span className={`text-white/40 transition-transform ${isOpen ? "rotate-180" : ""}`}>⌄</span>
              </button>
              {isOpen && (
                <div className="flex flex-wrap gap-2 px-4 py-3 bg-base-900/40">
                  {availableTags.length > 0 ? (
                    availableTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggle(tag)}
                        className="tap bg-base-850 border border-base-700 hover:border-accent-500/60 text-white/70 text-xs font-medium rounded-full px-3 py-1.5"
                      >
                        + {tag}
                      </button>
                    ))
                  ) : (
                    <span className="text-white/30 text-xs py-1">—</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
