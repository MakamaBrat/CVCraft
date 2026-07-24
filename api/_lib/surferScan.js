import { extractVacancyLinks, extractVacancyFieldsBatch } from "../geminiExtract.js";
import { rollRandomMedia } from "../giphyServer.js";

const TEMPLATES = ["minimal", "modern", "bold", "classic"];
const COLOR_SCHEMES = ["dark", "light"];

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

// Сканує один сайт: список -> кожна вакансія -> upsert у ОКРЕМІЙ таблиці
// parsed_vacancies (не в vacancies — щоб не мішати спарсене з юзерським).
// Повертає { found, created, updated, expired, error }.
export async function scanSite(admin, site) {
  let listText, listLinks;
  try {
    const listPage = await fetchListPage(site.url);
    listText = listPage.text;
    listLinks = listPage.links;
  } catch (err) {
    return { found: 0, created: 0, updated: 0, expired: 0, error: `list_fetch_failed: ${err.message}` };
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
      expired: 0,
      error: "no_links_in_raw_html: сторінка не містить посилань у вихідному HTML — ймовірно, контент рендериться через JS (SPA), а не приходить одразу від сервера",
    };
  }

  let links;
  try {
    links = await extractVacancyLinks(site.url, listText, listLinks);
  } catch (err) {
    return { found: 0, created: 0, updated: 0, expired: 0, error: `list_extract_failed: ${err.message}` };
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
      expired: 0,
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
  // що знайшов посилання вище — разом 2 запити до Gemini на сайт.
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
      return { found: links.length, created: 0, updated: 0, expired: 0, error: `fields_extract_failed: ${err.message}` };
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

  // Вакансії цього сайту, яких більше немає в свіжому скані — позначаємо
  // expired (не видаляємо, щоб не губити історію).
  let expired = 0;
  if (foundUrls.size > 0) {
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
  }

  return {
    found: links.length,
    created,
    updated,
    expired,
    error:
      created === 0 && updated === 0 && failures.length > 0
        ? `all_links_failed: ${failures.slice(0, 5).join(" | ")}`
        : null,
  };
}
