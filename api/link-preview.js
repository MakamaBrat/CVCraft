import { sendJson, methodNotAllowed } from "./_lib/respond.js";

// GET /api/link-preview?url=... — навмисно без авторизації, як і
// resume-share/vacancy-share: тягне лише публічні og:-теги сторінки
// (назва застосунку + іконка) для Google Play / App Store, щоб
// показати гарну картку замість голого посилання. Робиться на бекенді,
// бо ці сторінки не віддають CORS-заголовки для fetch() з браузера.
const ALLOWED_HOSTS = ["play.google.com", "apps.apple.com"];

function extractMeta(html) {
  const get = (re) => {
    const m = html.match(re);
    return m ? m[1] : null;
  };
  const title =
    get(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
    get(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i) ||
    get(/<title>([^<]+)<\/title>/i);
  const image =
    get(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
    get(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
  return { title, image };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  const url = req.query?.url;
  if (!url) return sendJson(res, 400, { error: "missing_url" });

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return sendJson(res, 400, { error: "invalid_url" });
  }
  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return sendJson(res, 400, { error: "host_not_allowed" });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const r = await fetch(parsed.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CVCraftBot/1.0)" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!r.ok) return sendJson(res, 502, { error: "fetch_failed" });
    const html = await r.text();
    const { title, image } = extractMeta(html);
    res.setHeader("Cache-Control", "public, max-age=3600");
    sendJson(res, 200, { title: title || null, image: image || null });
  } catch {
    sendJson(res, 502, { error: "fetch_failed" });
  }
}
