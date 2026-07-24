// Спільний форматер "як давно" — раніше жив тільки всередині Home.jsx
// (для резюме), тепер використовується і для вакансій (VacancyBrowse,
// VacancyList), щоб не дублювати логіку.
export function timeAgo(ts, t) {
  if (!ts) return "";
  const then = ts instanceof Date ? ts.getTime() : new Date(ts).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return t("timeAgo.justNow");
  if (min < 60) return t("timeAgo.minutes", min);
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return t("timeAgo.hours", hrs);
  const days = Math.floor(hrs / 24);
  if (days === 1) return t("timeAgo.yesterday");
  return t("timeAgo.days", days);
}
