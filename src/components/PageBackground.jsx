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
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up {
          animation: cvdeck-fade-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        /* Застосувати на батьківський елемент (напр. список карток), щоб
           кожна дитина з'являлась з невеликою затримкою одна за одною. */
        .stagger > * {
          opacity: 0;
          animation: cvdeck-fade-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .stagger > *:nth-child(1) { animation-delay: 0.02s; }
        .stagger > *:nth-child(2) { animation-delay: 0.06s; }
        .stagger > *:nth-child(3) { animation-delay: 0.10s; }
        .stagger > *:nth-child(4) { animation-delay: 0.14s; }
        .stagger > *:nth-child(5) { animation-delay: 0.18s; }
        .stagger > *:nth-child(6) { animation-delay: 0.22s; }
        .stagger > *:nth-child(7) { animation-delay: 0.26s; }
        .stagger > *:nth-child(8) { animation-delay: 0.30s; }
        .stagger > *:nth-child(9) { animation-delay: 0.34s; }
        .stagger > *:nth-child(n+10) { animation-delay: 0.38s; }
      `}</style>
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="cvdeck-bg absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${BG_URL})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col min-h-0">{children}</div>
    </div>
  );
}
