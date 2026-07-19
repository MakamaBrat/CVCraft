import { createContext, useContext, useMemo, useState } from "react";
import { dictionaries } from "./dictionaries.js";
import { getTelegramWebApp } from "../telegram.js";

const SUPPORTED = ["uk", "ru", "en"];
const STORAGE_KEY = "cvcraft.lang.v1";

// Мапить код мови Telegram (напр. "uk", "ru", "en", "de") на одну з
// підтримуваних мов застосунку. Все, що не uk/ru, падає в en.
export function resolveLanguage(code) {
  if (!code) return "en";
  const lc = String(code).toLowerCase();
  if (lc.startsWith("uk")) return "uk";
  if (lc.startsWith("ru")) return "ru";
  return "en";
}

export function detectInitialLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED.includes(stored)) return stored;
  } catch {
    // ignore
  }
  const tg = getTelegramWebApp();
  const tgCode = tg?.initDataUnsafe?.user?.language_code;
  return resolveLanguage(tgCode);
}

const LanguageContext = createContext(null);

function get(obj, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(detectInitialLanguage);

  const setLang = (next) => {
    if (!SUPPORTED.includes(next)) return;
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  const t = useMemo(() => {
    const dict = dictionaries[lang] || dictionaries.en;
    const fallback = dictionaries.en;
    return (path, ...args) => {
      const value = get(dict, path) ?? get(fallback, path);
      if (typeof value === "function") return value(...args);
      if (value == null) return path;
      return value;
    };
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t, supported: SUPPORTED }), [lang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}
