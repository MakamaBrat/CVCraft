// Рахує повний вік у роках на основі дати народження (рядок формату YYYY-MM-DD
// з <input type="date">). Повертає null, якщо дата відсутня/некоректна.
export function calcAge(birthDate) {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() >= b.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;

  if (age < 0 || age > 130) return null;
  return age;
}

// Українська/російська пляралізація "N років/лет/рік/года" тощо.
function pluralSlavic(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function formatAge(age, lang) {
  if (age == null) return "";
  if (lang === "uk") return `${age} ${pluralSlavic(age, "рік", "роки", "років")}`;
  if (lang === "ru") return `${age} ${pluralSlavic(age, "год", "года", "лет")}`;
  return `${age} y.o.`;
}
