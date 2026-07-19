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
    console.error("[verifyInitData] missing_init_data", {
      // Означає, що фронтенд не передав Authorization: "tma <initData>"
      // (напр. відкрито поза Telegram, або window.Telegram.WebApp.initData
      // порожній - типово, коли Mini App відкрито у звичайному браузері).
      typeofInitData: typeof initData,
    });
    return { ok: false, error: "missing_init_data" };
  }
  if (!botToken) {
    console.error("[verifyInitData] server_misconfigured: TELEGRAM_BOT_TOKEN is not set");
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
    // Найчастіша причина: TELEGRAM_BOT_TOKEN у Vercel не збігається з
    // токеном бота, через якого відкрито Mini App, або взагалі не заданий
    // (тоді botToken=="" і secretKey рахується від порожнього рядка).
    console.error("[verifyInitData] bad_signature", {
      hasBotToken: Boolean(botToken),
      botTokenLength: botToken ? botToken.length : 0,
    });
    return { ok: false, error: "bad_signature" };
  }

  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > MAX_AGE_SECONDS) {
    console.error("[verifyInitData] expired", {
      authDate,
      ageSeconds: authDate ? Math.round(Date.now() / 1000 - authDate) : null,
    });
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

  // Діагностика доступу до адмінки. Дивіться у Vercel → Deployments →
  // [деплой] → Functions → Logs після спроби відкрити адмін-панель.
  // Типові причини, чому match: false для реального адміна:
  //  - ADMIN_TELEGRAM_IDS не заданий у потрібному оточенні Vercel
  //    (Production/Preview/Development різні - треба перевірити те саме,
  //    де відкрито застосунок);
  //  - зайві пробіли/лапки в значенні (envRaw покаже сире значення);
  //  - переплутаний Telegram ID (не той акаунт/бот у Telegram Desktop
  //    показує числовий id інакше, ніж очікується) - звірте incomingId
  //    з тим, що реально вписано в змінну.
  console.log("[isAdminId]", {
    incomingId: String(telegramId),
    configuredAdmins: admins,
    envRaw: process.env.ADMIN_TELEGRAM_IDS,
    match: result,
  });

  return result;
}
