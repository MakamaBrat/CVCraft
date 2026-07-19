// Перевірка Telegram Mini App initData на сервері.
//
// Клієнт (window.Telegram.WebApp.initData) присилає RAW-рядок виду
// "query_id=...&user=...&auth_date=...&hash=...". Ми перераховуємо HMAC
// за офіційним алгоритмом Telegram і порівнюємо з полем hash. Тільки після
// цього довіряємо telegram_id, який прийшов у запиті — client-supplied
// telegram_id БЕЗ цієї перевірки довіряти не можна ніколи.
//
// Документація: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app

import crypto from "node:crypto";

const MAX_AGE_SECONDS = 24 * 60 * 60; // 24 години — запобігає replay-атаці зі старим initData

export function verifyInitData(initData, botToken) {
  if (!initData || typeof initData !== "string") {
    return { ok: false, error: "missing_init_data" };
  }
  if (!botToken) {
    return { ok: false, error: "server_misconfigured" };
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false, error: "missing_hash" };
  params.delete("hash");

  const pairs = [];
  for (const [key, value] of params.entries()) {
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const validSignature =
    computedHash.length === hash.length &&
    crypto.timingSafeEqual(Buffer.from(computedHash, "hex"), Buffer.from(hash, "hex"));

  if (!validSignature) {
    return { ok: false, error: "bad_signature" };
  }

  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > MAX_AGE_SECONDS) {
    return { ok: false, error: "expired" };
  }

  let user;
  try {
    user = JSON.parse(params.get("user") || "null");
  } catch {
    user = null;
  }
  if (!user?.id) return { ok: false, error: "missing_user" };

  return {
    ok: true,
    user: {
      id: String(user.id),
      username: user.username || "",
      firstName: user.first_name || "",
      lastName: user.last_name || "",
      languageCode: user.language_code || "",
    },
  };
}

// Дістає initData з заголовка Authorization: "tma <initData>" (рекомендований
// Telegram формат) або з тіла запиту як запасний варіант.
export function extractInitData(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (authHeader && authHeader.startsWith("tma ")) {
    return authHeader.slice(4);
  }
  if (req.body && typeof req.body === "object" && req.body.initData) {
    return req.body.initData;
  }
  return null;
}

export function requireUser(req, botToken) {
  const initData = extractInitData(req);
  return verifyInitData(initData, botToken);
}

export function isAdminId(telegramId) {
  const admins = String(process.env.ADMIN_TELEGRAM_IDS || "")
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
  const result = admins.includes(String(telegramId));

  // ТИМЧАСОВЕ логування для діагностики. Видивіться у Vercel →
  // Deployments → відповідний деплой → Functions → Logs після спроби
  // відкрити застосунок. Приберіть цей console.log, коли проблему знайдено.
  console.log("[isAdminId]", {
    incomingId: String(telegramId),
    configuredAdmins: admins,
    envRaw: process.env.ADMIN_TELEGRAM_IDS,
    match: result,
  });

  return result;
}
