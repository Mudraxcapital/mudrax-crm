/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0F172A",
          accent: "#0EA5E9",
          muted: "#64748B",
          surface: "#F8FAFC",
        },
      },
    },
  },
  plugins: [],
};
