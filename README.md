# CVCraft

Мобільний веб-застосунок для створення резюме: майстер заповнення даних, вибір шаблону, попередній перегляд і завантаження у PDF (через друк браузера). Дані резюме зберігаються локально в браузері (localStorage).

## Запуск локально

```bash
npm install
npm run dev
```

## Деплой на Vercel

1. Завантажте цю папку на GitHub (новий репозиторій).
2. На vercel.com натисніть **Add New → Project**, оберіть репозиторій.
3. Vercel сам розпізнає Vite-проєкт (Framework Preset: Vite). Натисніть **Deploy**.

Або через CLI:

```bash
npm i -g vercel
vercel
```

## Стек

- React 18 + Vite
- Tailwind CSS
- Дані зберігаються в localStorage (без бекенду)
