// Service-role клієнт Supabase. Використовувати ТІЛЬКИ в /api (серверний
// код). SUPABASE_SERVICE_ROLE_KEY не має префікса VITE_, тому Vite ніколи
// не покладе його у фронтенд-бандл — але про всяк випадок ніколи не
// імпортуйте цей файл з src/.

import { createClient } from "@supabase/supabase-js";

let client = null;

export function supabaseAdmin() {
  if (client) return client;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    // ВАЖЛИВО для діагностики "зникнення" записів: якщо ключ не заданий
    // (або заданий з помилкою) у Vercel → Project Settings → Environment
    // Variables, кожен запит до /api впаде тут з 500, а фронтенд може
    // це проковтнути і просто показати порожній список. Дивіться
    // Vercel → Deployments → [деплой] → Functions → Logs на рядок [supabaseAdmin].
    console.error("[supabaseAdmin] missing configuration", {
      hasUrl: Boolean(url),
      hasServiceRoleKey: Boolean(key),
      // Не логуємо самі значення (секрет), лише довжину - щоб перевірити,
      // що змінна не порожня і не з зайвими лапками/пробілами.
      urlLength: url ? url.length : 0,
      serviceRoleKeyLength: key ? key.length : 0,
    });
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  console.log("[supabaseAdmin] client initialized", {
    urlHost: (() => {
      try {
        return new URL(url).host;
      } catch {
        return "invalid_url";
      }
    })(),
  });
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
