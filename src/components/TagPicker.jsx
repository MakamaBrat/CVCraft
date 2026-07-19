import { useState } from "react";
import { SUGGESTED_TAGS } from "../lib/tags.js";

const INITIAL_VISIBLE = 12;

/**
 * Клікабельний вибір тегів зі списку підказок + можливість ввести свій.
 * value: string[] — обрані теги
 * onChange: (nextTags: string[]) => void
 */
export default function TagPicker({ value = [], onChange, placeholder, addLabel, moreLabel, lessLabel }) {
  const [val, setVal] = useState("");
  const [expanded, setExpanded] = useState(false);

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

  const available = SUGGESTED_TAGS.filter((tg) => !value.includes(tg));
  const visible = expanded ? available : available.slice(0, INITIAL_VISIBLE);

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

      <div className="flex flex-wrap gap-2">
        {visible.map((tag) => (
          <button
            key={tag}
            onClick={() => toggle(tag)}
            className="tap bg-base-850 border border-base-700 hover:border-accent-500/60 text-white/70 text-xs font-medium rounded-full px-3 py-1.5"
          >
            + {tag}
          </button>
        ))}
        {available.length > INITIAL_VISIBLE && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="tap text-accent-300 text-xs font-medium rounded-full px-3 py-1.5"
          >
            {expanded ? lessLabel : moreLabel}
          </button>
        )}
      </div>
    </div>
  );
}
