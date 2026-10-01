/** @type {import('tailwindcss').Config} */
module.exports = {
  // Static build replacing the Tailwind Play CDN (cdn.tailwindcss.com), which
  // recompiled every utility class in the browser on every single page load.
  // Run `npm run build:css` after editing markup/config, or `npm run watch:css`
  // while developing. The compiled output (css/tailwind.css) is committed so no
  // build step is required at deploy time.
  content: [
    "./*.html",
    "./admin/**/*.html",
    "./sales/**/*.html",
    "./superadmin/**/*.html",
    "./admin/**/*.js",
    "./sales/**/*.js",
    "./superadmin/**/*.js",
    "./js/**/*.js",
    "!./node_modules/**",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: { inter: ["Inter", "system-ui", "sans-serif"] },
      boxShadow: { glow: "0 0 35px rgba(56,189,248,.25)" },
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
