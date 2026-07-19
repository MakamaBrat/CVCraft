/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#0a0a12",
          900: "#12121c",
          850: "#171725",
          800: "#1c1c2c",
          700: "#26263a",
          600: "#34344c",
        },
        violet: {
          400: "#8b7fff",
          500: "#6c5ce7",
          600: "#5643d9",
        },
      },
      fontFamily: {
        sans: ["Manrope", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(108,92,231,0.35)",
      },
    },
  },
  plugins: [],
};
