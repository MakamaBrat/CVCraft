import { extractVacancyLinks, extractVacancyFields } from "../geminiExtract.js";
import { rollRandomMedia } from "../giphyServer.js";

const TEMPLATES = ["minimal", "modern", "bold", "classic"];
const COLOR_SCHEMES = ["dark", "light"];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function fetchPageText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; OnlineSurferBot/1.0)" },
  });
  if (!res.ok) throw new Error(`fetch_failed_${res.status}`);
  const html = await res.text();
  // Груба, але достатня для передачі в LLM очистка тегів — Claude сам
  // розбереться зі структурою тексту, точний HTML-парсинг тут не потрібен.
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Сканує один сайт: список -> кожна вакансія -> upsert у ОКРЕМІЙ таблиці
// parsed_vacancies (не в vacancies — щоб не мішати спарсене з юзерським).
// Повертає { found, created, updated, expired, error }.
export async function scanSite(admin, site) {
  let listText;
  try {
    listText = await fetchPageText(site.url);
  } catch (err) {
    return { found: 0, created: 0, updated: 0, expired: 0, error: `list_fetch_failed: ${err.message}` };
  }

  let links;
  try {
    links = await extractVacancyLinks(site.url, listText);
  } catch (err) {
    return { found: 0, created: 0, updated: 0, expired: 0, error: `list_extract_failed: ${err.message}` };
  }

  const foundUrls = new Set();
  let created = 0;
  let updated = 0;

  for (const link of links) {
    if (!link?.url) continue;
    foundUrls.add(link.url);

    let pageText;
    try {
      pageText = await fetchPageText(link.url);
    } catch (err) {
      console.warn("[surferScan] page fetch failed", link.url, err.message);
      continue;
    }

    let fields;
    try {
      fields = await extractVacancyFields(link.url, pageText);
    } catch (err) {
      console.warn("[surferScan] page extract failed", link.url, err.message);
      continue;
    }
    if (!fields?.position) continue;

    const { data: existing } = await admin
      .from("parsed_vacancies")
      .select("id")
      .eq("source_site_id", site.id)
      .eq("external_url", link.url)
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
            description: fields.description || null,
            requirements: fields.requirements || null,
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
      external_url: link.url,
      status: "active",
      data: {
        position: fields.position,
        company: fields.company || site.company_name || null,
        location: fields.location || null,
        description: fields.description || null,
        requirements: fields.requirements || null,
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
    else console.warn("[surferScan] insert failed", link.url, insertError.message);
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

  return { found: links.length, created, updated, expired, error: null };
}
