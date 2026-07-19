/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#060606",
          900: "#0d0d0d",
          850: "#131313",
          800: "#1a1a1a",
          700: "#262626",
          600: "#363636",
        },
        accent: {
          200: "#ffffff",
          300: "#d4d4d8",
          400: "#e4e4e7",
          500: "#f4f4f5",
          600: "#e4e4e7",
          700: "#d4d4d8",
        },
      },
      fontFamily: {
        sans: ["Manrope", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(255,255,255,0.12)",
      },
    },
  },
  plugins: [],
};
