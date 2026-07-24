import BG_URL from "../assets/bg-home.png";

// Той самий фон, що й на головному екрані (Home.jsx): картинка з повільним
// "диханням" (drift) + градієнт до чорного зверху вниз, щоб контент лишався
// читабельним. Тут же визначені й спільні keyframes для появи елементів
// (fade-up / stagger), тому їх достатньо один раз — компонент змонтований
// на кожному екрані.
export default function PageBackground({ children, className = "" }) {
  return (
    <div className={`relative flex-1 flex flex-col bg-black overflow-hidden ${className}`}>
      <style>{`
        @keyframes cvdeck-drift {
          0%   { transform: scale(1.12) translate3d(0, 0, 0); }
          50%  { transform: scale(1.12) translate3d(-2%, -1.5%, 0); }
          100% { transform: scale(1.12) translate3d(0, 0, 0); }
        }
        .cvdeck-bg {
          animation: cvdeck-drift 26s ease-in-out infinite;
        }

        @keyframes cvdeck-fade-up {
          0% {
            opacity: 0;
            transform: translate3d(-28px, 14px, 0) scale(0.94);
          }
          60% {
            opacity: 1;
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        .fade-up {
          animation: cvdeck-fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        /* Застосувати на батьківський елемент (напр. список карток), щоб
           кожна дитина виїжджала збоку з невеликою затримкою одна за одною. */
        .stagger > * {
          opacity: 0;
          animation: cvdeck-fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .stagger > *:nth-child(2n) {
          animation-name: cvdeck-fade-up-right;
        }
        @keyframes cvdeck-fade-up-right {
          0% {
            opacity: 0;
            transform: translate3d(28px, 14px, 0) scale(0.94);
          }
          60% {
            opacity: 1;
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        .stagger > *:nth-child(1) { animation-delay: 0.03s; }
        .stagger > *:nth-child(2) { animation-delay: 0.09s; }
        .stagger > *:nth-child(3) { animation-delay: 0.15s; }
        .stagger > *:nth-child(4) { animation-delay: 0.21s; }
        .stagger > *:nth-child(5) { animation-delay: 0.27s; }
        .stagger > *:nth-child(6) { animation-delay: 0.33s; }
        .stagger > *:nth-child(7) { animation-delay: 0.39s; }
        .stagger > *:nth-child(8) { animation-delay: 0.45s; }
        .stagger > *:nth-child(9) { animation-delay: 0.51s; }
        .stagger > *:nth-child(n+10) { animation-delay: 0.57s; }
      `}</style>
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="cvdeck-bg absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${BG_URL})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black" />
      </div>

      {/* Фон лишається на весь екран (заходить під контроли Telegram у
          fullscreen-режимі), а сам контент зсувається вниз на
          --tg-safe-area-top, щоб заголовок/кнопка "назад" не ховались під
          напівпрозорими "Закрити"/"▾"/"•••", які Telegram малює поверх
          сторінки. Значення змінної рахує watchTelegramSafeArea()
          (lib/telegram.js) і оновлює на <html> — тут лише підстановка з
          безпечним фолбеком 0 поза Telegram/fullscreen. */}
      <div
        className="relative z-10 flex-1 flex flex-col min-h-0"
        style={{ paddingTop: "var(--tg-safe-area-top, 0px)" }}
      >
        {children}
      </div>
    </div>
  );
}
