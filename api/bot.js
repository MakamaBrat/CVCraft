// Vercel serverless function: обробляє вебхук Telegram-бота.
// На команду /start надсилає повідомлення з кнопкою "Start", яка
// відкриває CV DECK як Telegram Mini App.
//
// Налаштування (Vercel → Settings → Environment Variables):
//   TELEGRAM_BOT_TOKEN  — токен бота від @BotFather
//   PUBLIC_APP_URL      — https-адреса цього застосунку, напр. https://cvcraft.vercel.app
//
// Після деплою один раз зареєструйте вебхук (див. README, розділ 6):
//   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<ваш-домен>/api/bot"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(200).json({ ok: true });
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const appUrl = process.env.PUBLIC_APP_URL;

  if (!token || !appUrl) {
    console.error("TELEGRAM_BOT_TOKEN or PUBLIC_APP_URL is not set");
    res.status(200).json({ ok: true });
    return;
  }

  const update = req.body;
  const message = update?.message;
  const text = message?.text?.trim();
  const chatId = message?.chat?.id;

  if (!chatId) {
    res.status(200).json({ ok: true });
    return;
  }

  try {
    if (text === "/start" || text?.startsWith("/start ")) {
      const startParam = text.includes(" ") ? text.split(" ")[1] : "";
      const launchUrl = startParam ? `${appUrl}#/r/${startParam}` : appUrl;

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "Створюй, редагуй і ділись резюме прямо в Telegram.",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Start",
                  web_app: { url: launchUrl },
                },
              ],
            ],
          },
        }),
      });
    }
  } catch (err) {
    console.error("Telegram bot handler error:", err);
  }

  res.status(200).json({ ok: true });
}
