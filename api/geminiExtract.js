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

async function callGemini(systemPrompt, userText, responseSchema) {
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

const VACANCY_SCHEMA = {
  type: "object",
  properties: {
    position: { type: "string" },
    company: { type: "string", nullable: true },
    location: { type: "string", nullable: true },
    description: { type: "string", nullable: true },
    requirements: { type: "string", nullable: true },
    contactTelegram: { type: "string", nullable: true },
    contactEmail: { type: "string", nullable: true },
    tags: { type: "array", items: { type: "string" }, nullable: true },
  },
  required: ["position"],
};

// Зі сторінки-списку вакансій (сирий текст + реальний перелік знайдених
// <a href>) вибирає ті посилання, що ведуть на окремі вакансії.
// URL-и вже абсолютні (резолвнуті на бекенді) — LLM лише фільтрує та,
// за потреби, підказує заголовок з видимого тексту, а не вигадує самі URL.
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

// Зі сторінки конкретної вакансії (сирий текст) робить структурований об'єкт
// у форматі, сумісному з полем `data` таблиці vacancies.
export async function extractVacancyFields(pageUrl, pageText) {
  const system = `Ти отримуєш текст сторінки однієї вакансії (${pageUrl}).
Витягни: position (назва посади), company (назва компанії, якщо є),
location (локація/формат роботи, напр. "Remote" або "Ukraine"),
description (опис ролі й обов'язків, звичайний текст, збережи структуру абзацами),
requirements (вимоги до кандидата, звичайний текст),
contactTelegram (нікнейм у телеграмі без @, якщо вказаний),
contactEmail (email, якщо вказаний),
tags (масив 3-6 коротких ключових слів по вакансії — стек технологій, навички
чи тип зайнятості, напр. ["React", "Remote", "Middle"], якщо зі сторінки
видно недостатньо — поверни менше тегів або порожній масив, не вигадуй зайве).
Якщо якогось поля немає на сторінці — не вигадуй, лиши порожнім.`;
  return callGemini(system, pageText.slice(0, 15000), VACANCY_SCHEMA);
}
