import { extractVacancyLinks, extractVacancyFieldsBatch } from "../geminiExtract.js";
import { rollRandomMedia } from "../giphyServer.js";

const TEMPLATES = ["minimal", "modern", "bold", "classic"];
const COLOR_SCHEMES = ["dark", "light"];

// Скільки сторінок дозволяємо просканувати за один ручний запуск
// "парсити N сторінок" — щоб не впертися в тайм-аут функції й ліміти Gemini.
export const MAX_MANUAL_PAGES = 15;

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function stripHtml(html) {
  // Груба, але достатня для передачі в LLM очистка тегів — Claude/Gemini сам
  // розбереться зі структурою тексту, точний HTML-парсинг тут не потрібен.
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Витягує всі <a href> ДО того, як теги (і разом з ними href-атрибути)
// зникнуть при очистці. Без цього кроку stripHtml прибирає геть усі URL
// зі сторінки, і LLM просто нема з чого брати посилання на вакансії.
function extractLinks(html, baseUrl) {
  const links = [];
  const seen = new Set();
  const re = /<a\b[^>]*href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    let href;
    try {
      href = new URL(m[1].trim(), baseUrl).toString();
    } catch {
      continue;
    }
    if (!href.startsWith("http")) continue;
    if (seen.has(href)) continue;
    seen.add(href);
    const text = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    links.push({ href, text: text.slice(0, 120) });
  }
  return links;
}

async function fetchPageText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; OnlineSurferBot/1.0)" },
  });
  if (!res.ok) throw new Error(`fetch_failed_${res.status}`);
  const html = await res.text();
  return stripHtml(html);
}

// Для сторінки-списку потрібен ще й перелік реальних <a href> — окремо від
// зачищеного тексту, — інакше LLM бачить тільки видимий текст без жодного URL.
async function fetchListPage(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; OnlineSurferBot/1.0)" },
  });
  if (!res.ok) throw new Error(`fetch_failed_${res.status}`);
  const html = await res.text();
  return { text: stripHtml(html), links: extractLinks(html, url) };
}

// Підставляє номер сторінки в URL: якщо в query вже є "page" — перезаписує
// його, інакше додає. Так з "https://djinni.co/jobs/?page=2" на кроці 3
// вийде "https://djinni.co/jobs/?page=3", а з "https://example.com/jobs"
// (без параметра) вийде "https://example.com/jobs?page=3".
export function buildPageUrl(baseUrl, pageNum) {
  try {
    const u = new URL(baseUrl);
    u.searchParams.set("page", String(pageNum));
    return u.toString();
  } catch {
    return baseUrl;
  }
}

// Сканує ОДНУ вже конкретну сторінку-список (список -> кожна вакансія ->
// upsert у parsed_vacancies). Без позначення expired — цим займається
// виклик, що знає, чи це повний скан сайту, чи лише частина сторінок.
// Повертає { found, created, updated, error, foundUrls }.
async function scanOneListPage(admin, site, pageUrl) {
  let listText, listLinks;
  try {
    const listPage = await fetchListPage(pageUrl);
    listText = listPage.text;
    listLinks = listPage.links;
  } catch (err) {
    return { found: 0, created: 0, updated: 0, foundUrls: new Set(), error: `list_fetch_failed: ${err.message}` };
  }

  if (listLinks.length === 0) {
    // На сторінці взагалі немає жодного <a href> у сирому HTML — типова
    // ознака SPA (React/Next/Vue), де контент домальовується JS-ом на
    // клієнті. Наш fetch бачить лише порожній каркас, тож повідомляємо
    // про це прямо, замість тихого "found: 0".
    return {
      found: 0,
      created: 0,
      updated: 0,
      foundUrls: new Set(),
      error: "no_links_in_raw_html: сторінка не містить посилань у вихідному HTML — ймовірно, контент рендериться через JS (SPA), а не приходить одразу від сервера",
    };
  }

  let links;
  try {
    links = await extractVacancyLinks(pageUrl, listText, listLinks);
  } catch (err) {
    return { found: 0, created: 0, updated: 0, foundUrls: new Set(), error: `list_extract_failed: ${err.message}` };
  }

  const foundUrls = new Set(links.map((l) => l?.url).filter(Boolean));
  let created = 0;
  let updated = 0;

  if (links.length === 0) {
    // Посилання на сторінці БУЛИ (інакше впали б раніше на
    // no_links_in_raw_html), але Gemini жодне з них не визнав вакансією.
    // Показуємо це явно в last_scan_error, щоб не виглядало як "нічого
    // не сталося" — і додаємо приклад посилань для діагностики.
    const sample = listLinks.slice(0, 5).map((l) => l.href).join(", ");
    return {
      found: 0,
      created: 0,
      updated: 0,
      foundUrls,
      error: `gemini_filtered_all_links: на сторінці знайдено ${listLinks.length} посилань, але жодне не визначено як вакансія. Приклади: ${sample}`,
    };
  }

  // Обмежуємо кількість вакансій за один прогін — і щоб укластись у
  // тайм-аут функції, і щоб не перевищити ліміт розміру одного запиту до
  // Gemini. Якщо на сайті більше — решту підхопить наступний скан.
  const MAX_LINKS_PER_SCAN = 20;
  const linksToProcess = links.slice(0, MAX_LINKS_PER_SCAN).filter((l) => l?.url);

  // Завантаження сторінок — звичайний fetch, не рахується в ліміти Gemini,
  // тож паралелимо без обмежень. А ось LLM-виклик на весь скан — РІВНО
  // ОДИН пакетний запит (замість одного на кожну вакансію), плюс той,
  // що знайшов посилання вище — разом 2 запити до Gemini на сторінку.
  const failures = [];
  const fetchedPages = [];
  await Promise.all(
    linksToProcess.map(async (link) => {
      try {
        const text = await fetchPageText(link.url);
        fetchedPages.push({ url: link.url, text });
      } catch (err) {
        console.warn("[surferScan] page fetch failed", link.url, err.message);
        failures.push(`${link.url}: fetch_failed(${err.message})`);
      }
    })
  );

  let fieldsList = [];
  if (fetchedPages.length > 0) {
    try {
      fieldsList = await extractVacancyFieldsBatch(fetchedPages);
    } catch (err) {
      return { found: links.length, created: 0, updated: 0, foundUrls, error: `fields_extract_failed: ${err.message}` };
    }
  }
  const fieldsByUrl = new Map(fieldsList.map((f) => [f.url, f]));

  for (const page of fetchedPages) {
    const fields = fieldsByUrl.get(page.url);
    if (!fields?.position) {
      failures.push(`${page.url}: no_position_field`);
      continue;
    }

    const { data: existing } = await admin
      .from("parsed_vacancies")
      .select("id")
      .eq("source_site_id", site.id)
      .eq("external_url", page.url)
      .maybeSingle();

    if (existing) {
      const { error } = await admin
        .from("parsed_vacancies")
        .update({
          status: "active",
          data: {
            position: fields.position,
            company: fields.company || site.company_name || null,
            location: fields.location || null,
            contactTelegram: fields.contactTelegram || null,
            contactEmail: fields.contactEmail || null,
            tags: Array.isArray(fields.tags) ? fields.tags.filter(Boolean).slice(0, 6) : [],
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (!error) updated += 1;
      continue;
    }

    // Кубик: рандомна аватарка/фон + шаблон/тему, бо в спарсеної вакансії
    // немає своїх картинок.
    const { avatarUrl, backgroundUrl } = await rollRandomMedia();

    const { error: insertError } = await admin.from("parsed_vacancies").insert({
      source_site_id: site.id,
      external_url: page.url,
      status: "active",
      data: {
        position: fields.position,
        company: fields.company || site.company_name || null,
        location: fields.location || null,
        contactTelegram: fields.contactTelegram || null,
        contactEmail: fields.contactEmail || null,
        tags: Array.isArray(fields.tags) ? fields.tags.filter(Boolean).slice(0, 6) : [],
        avatarUrl,
        backgroundUrl,
        colorScheme: pick(COLOR_SCHEMES),
        template: pick(TEMPLATES),
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (!insertError) created += 1;
    else console.warn("[surferScan] insert failed", page.url, insertError.message);
  }

  return {
    found: links.length,
    created,
    updated,
    foundUrls,
    error:
      created === 0 && updated === 0 && failures.length > 0
        ? `all_links_failed: ${failures.slice(0, 5).join(" | ")}`
        : null,
  };
}

// Позначає expired ті вакансії цього сайту, яких немає серед свіжо
// знайдених foundUrls (не видаляє, щоб не губити історію).
async function markExpired(admin, site, foundUrls) {
  let expired = 0;
  if (foundUrls.size === 0) return expired;
  const { data: staleRows } = await admin
    .from("parsed_vacancies")
    .select("id, external_url")
    .eq("source_site_id", site.id)
    .neq("status", "expired");
  const stale = (staleRows || []).filter((r) => !foundUrls.has(r.external_url));
  if (stale.length > 0) {
    const { error } = await admin
      .from("parsed_vacancies")
      .update({ status: "expired" })
      .in("id", stale.map((r) => r.id));
    if (!error) expired = stale.length;
  }
  return expired;
}

// Сканує один сайт (одна сторінка-список = site.url) -> кожна вакансія ->
// upsert у ОКРЕМІЙ таблиці parsed_vacancies (не в vacancies — щоб не
// мішати спарсене з юзерським). Повертає { found, created, updated,
// expired, error }. Викликається кроном і кнопкою "Сканувати зараз".
export async function scanSite(admin, site) {
  const result = await scanOneListPage(admin, site, site.url);
  const expired = await markExpired(admin, site, result.foundUrls);
  return {
    found: result.found,
    created: result.created,
    updated: result.updated,
    expired,
    error: result.error,
  };
}

// Сканує N сторінок пагінації одного сайту поспіль, самостійно підставляючи
// номер сторінки в URL (page=1, page=2, ... page=pageCount) — саме те, що
// стоїть за кнопкою "парсити вказану кількість сторінок" в адмінці.
// pageCount обрізається до MAX_MANUAL_PAGES. Повертає { found, created,
// updated, expired, error, perPage } — perPage містить деталі по кожній
// сторінці для показу користувачу.
export async function scanSitePages(admin, site, pageCount) {
  const pages = Math.max(1, Math.min(MAX_MANUAL_PAGES, Number(pageCount) || 1));
  const allFoundUrls = new Set();
  let found = 0;
  let created = 0;
  let updated = 0;
  const perPage = [];

  for (let p = 1; p <= pages; p++) {
    const pageUrl = buildPageUrl(site.url, p);
    const result = await scanOneListPage(admin, site, pageUrl);
    found += result.found;
    created += result.created;
    updated += result.updated;
    for (const u of result.foundUrls) allFoundUrls.add(u);
    perPage.push({ page: p, url: pageUrl, found: result.found, created: result.created, updated: result.updated, error: result.error });

    // Якщо сторінка взагалі не віддала жодної вакансії і при цьому дала
    // помилку (403, no_links, і т.д.) — далі гортати немає сенсу, це,
    // швидше за все, кінець списку або сайт нас заблокував.
    if (result.found === 0 && result.error) break;
  }

  const expired = await markExpired(admin, site, allFoundUrls);
  const failedPages = perPage.filter((pg) => pg.error);
  const error =
    created === 0 && updated === 0 && failedPages.length > 0
      ? `pages_failed: ${failedPages.slice(0, 5).map((pg) => `p${pg.page}: ${pg.error}`).join(" | ")}`
      : null;

  return { found, created, updated, expired, error, perPage };
}
