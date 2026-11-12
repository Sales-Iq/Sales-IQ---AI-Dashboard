/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.html",
    "./admin/**/*.html",
    "./sales/**/*.html",
    "./superadmin/**/*.html",
    "./admin/**/*.js",
    "./sales/**/*.js",
    "./superadmin/**/*.js",
    "./js/**/*.js",
    "!./node_modules/**",
    "!./dist/**",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: "#090d14",
          900: "#0e1521",
          850: "#121a26",
          800: "#182232",
        },
        brand: {
          blue: "#3b82f6",
          sky: "#38bdf8",
          cyan: "#0ea5e9",
          violet: "#8b5cf6",
          indigo: "#6366f1",
          emerald: "#10b981",
          amber: "#f59e0b",
          crimson: "#ef4444",
        },
        lumelle: {
          mint: "#38bdf8", // mapped to website sky blue
          teal: "#0ea5e9",
          violet: "#8b5cf6",
          gold: "#f59e0b",
          emerald: "#10b981",
          amber: "#f59e0b",
          crimson: "#ef4444",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        inter: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 35px rgba(56,189,248,.25)",
        "glass-sm": "0 4px 16px 0 rgba(0, 0, 0, 0.35)",
        "glass-md": "0 8px 32px 0 rgba(0, 0, 0, 0.45)",
        "glass-lg": "0 16px 48px 0 rgba(0, 0, 0, 0.55)",
        "lumelle-mint": "0 0 25px -4px rgba(56, 189, 248, 0.35)",
        "lumelle-violet": "0 0 25px -4px rgba(139, 92, 246, 0.35)",
      },
      animation: {
        floaty: "floaty 7s ease-in-out infinite",
        shimmer: "shimmer 2.6s linear infinite",
        pulseSoft: "pulseSoft 2.8s ease-in-out infinite",
        slideUp: "slideUp .65s cubic-bezier(.2,.9,.2,1) both",
      },
      keyframes: {
        floaty: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-18px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseSoft: {
          "0%,100%": { opacity: ".65", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.04)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(22px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
