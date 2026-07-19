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
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
