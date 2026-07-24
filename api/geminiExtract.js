// Той самий функціонал, що й claudeExtract.js, але через Google Gemini API
// замість Anthropic. Сигнатури функцій ідентичні — можна імпортувати цей
// файл замість claudeExtract.js у surferScan.js без жодних інших змін.
//
// ПОТРІБНА змінна оточення GEMINI_API_KEY.
// Ключ береться тут: https://aistudio.google.com/app/apikey
// (у Google AI Studio є безкоштовний rate-limited тір на моделі
// gemini-2.5-flash — для парсингу текстових сторінок цього зазвичай
// достатньо, платити доведеться, лише якщо перевищите ліміти запитів).

// gemini-flash-latest — alias, який Google сам перенаправляє на актуальну
// flash-модель. Раніше тут була жорстко зашита конкретна версія
// (gemini-2.5-flash), і коли Google її прибрав з доступу для нових
// проєктів, парсинг почав падати з 404. Alias цього уникає.
const MODEL = "gemini-flash-latest";
const API_KEY = process.env.GEMINI_API_KEY;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(systemPrompt, userText, responseSchema, attempt = 0) {
  if (!API_KEY) throw new Error("GEMINI_API_KEY not set");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userText }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        ...(responseSchema ? { responseSchema } : {}),
      },
    }),
  });

  if (res.status === 429 && attempt < 1) {
    // Лише один ретрай з невеликою паузою: якщо квота вичерпана надовго
    // (а не тимчасовий ліміт запитів/хвилину), повторні спроби все одно
    // не допоможуть, а тільки з'їдять бюджет часу функції (maxDuration).
    await sleep(3000);
    return callGemini(systemPrompt, userText, responseSchema, attempt + 1);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`gemini_api_error: ${res.status} ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  if (!text) throw new Error("gemini_empty_response");
  return JSON.parse(text);
}

const LINKS_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      url: { type: "string" },
      title: { type: "string" },
    },
    required: ["url"],
  },
};

const VACANCY_BATCH_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      url: { type: "string" },
      position: { type: "string" },
      company: { type: "string", nullable: true },
      location: { type: "string", nullable: true },
      contactTelegram: { type: "string", nullable: true },
      contactEmail: { type: "string", nullable: true },
      tags: { type: "array", items: { type: "string" }, nullable: true },
    },
    required: ["url", "position"],
  },
};

// Зі сторінки-списку вакансій (сирий текст) витягує масив посилань на
// окремі вакансії разом із заголовком (якщо видно з самого списку).
export async function extractVacancyLinks(pageUrl, pageText, links = []) {
  if (!links.length) return [];
  const linksBlock = links
    .map((l, i) => `${i + 1}. ${l.href}${l.text ? ` — "${l.text}"` : ""}`)
    .join("\n");
  const system = `Ти отримуєш текст сторінки зі списком вакансій компанії (${pageUrl})
та пронумерований перелік усіх посилань, знайдених на цій сторінці.
Вибери з переліку ТІЛЬКИ ті посилання, які ведуть на сторінку окремої
конкретної вакансії (а не на головну, контакти, інші розділи сайту тощо).
Поверни їх url ТОЧНО як у переліку (нічого не вигадуй і не змінюй), і title —
короткий заголовок вакансії з тексту посилання чи сторінки, якщо видно.
Якщо відповідних посилань немає — поверни порожній масив.

Перелік посилань:
${linksBlock}`;
  const result = await callGemini(system, pageText.slice(0, 8000), LINKS_SCHEMA);
  return Array.isArray(result) ? result : [];
}

// Один запит замість одного-на-вакансію: отримує вже завантажений текст
// КІЛЬКОХ сторінок вакансій одразу (кожна позначена своїм URL) і повертає
// масив структурованих об'єктів. Так на весь скан сайту йде лише 2 запити
// до Gemini (посилання + пачка даних) незалежно від кількості вакансій.
export async function extractVacancyFieldsBatch(pages) {
  if (!pages.length) return [];
  // Без опису/вимог для полів достатньо початку сторінки (заголовок,
  // шапка вакансії, теги) — решта тексту все одно не використовується.
  const PER_PAGE_CHARS = 1200;
  const body = pages
    .map((p) => `=== URL: ${p.url} ===\n${p.text.slice(0, PER_PAGE_CHARS)}`)
    .join("\n\n");
  const system = `Ти отримуєш текст кількох сторінок вакансій, кожна починається з рядка
"=== URL: <адреса> ===". Для КОЖНОЇ сторінки поверни окремий об'єкт у масиві з полями:
url (та сама адреса, ТОЧНО як у заголовку блоку, нічого не змінюй),
position (назва посади), company (назва компанії, якщо є),
location (локація/формат роботи, напр. "Remote" або "Ukraine"),
НЕ витягуй опис ролі, обов'язки чи вимоги — цих полів більше немає,
повний опис користувач подивиться за посиланням external_url на
оригінальну сторінку,
contactTelegram (нікнейм у телеграмі без @, якщо вказаний),
contactEmail (email, якщо вказаний),
tags (масив 3-6 коротких ключових слів по вакансії — стек технологій, навички
чи тип зайнятості, напр. ["React", "Remote", "Middle"], якщо зі сторінки
видно недостатньо — поверни менше тегів або порожній масив, не вигадуй зайве).
Якщо якогось поля немає на сторінці — не вигадуй, лиши порожнім.
Якщо сторінка виявилась не вакансією (помилка, порожньо, редирект тощо) —
все одно поверни об'єкт з цим url, але з порожнім position.`;
  const result = await callGemini(system, body, VACANCY_BATCH_SCHEMA);
  return Array.isArray(result) ? result : [];
}
