import { getTelegramInitData } from "./telegram.js";

// backendEnabled: раніше базувалось на наявності supabase URL/anon key на
// клієнті. Тепер клієнт узагалі не знає про Supabase — усе ходить через
// наш /api, який сам вирішує, чи налаштована база. Вважаємо бекенд
// доступним, якщо застосунок відкрито всередині Telegram (є initData),
// бо без цього жоден /api виклик все одно не пройде авторизацію.
export const backendEnabled = Boolean(getTelegramInitData());

export async function apiFetch(path, { method = "GET", body, timeoutMs } = {}) {
  const initData = getTelegramInitData();
  const headers = { "Content-Type": "application/json" };
  if (initData) headers.Authorization = `tma ${initData}`;

  const controller = timeoutMs ? new AbortController() : null;
  const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null;

  let res;
  try {
    res = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller?.signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      const error = new Error("request_timeout");
      error.status = 0;
      throw error;
    }
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }

  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    const error = new Error(json?.error || `request_failed_${res.status}`);
    error.status = res.status;
    error.payload = json;
    throw error;
  }
  return json;
}
