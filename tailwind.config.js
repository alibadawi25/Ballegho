/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Brand palette
        ink:     "#0e1a2b",
        gold:    "#b8892a",
        paper:   "#f5efe2",
        emerald: "#2d6b4f",
        rose:    "#a84a3d",

        // Extended light tokens
        "ink-soft":   "#3d4a5e",
        "ink-muted":  "#7a8193",
        "ink-faint":  "#b9bcc4",
        "gold-soft":  "#e8d49a",
        "gold-deep":  "#8a6417",
        "paper-alt":  "#ede4d0",
        "paper-dim":  "#faf4e7",

        // Extended dark tokens
        "night":      "#0a1422",
        "night-alt":  "#0e1a2b",
        "surface":    "#122236",
        "surface-dim":"#0f1d31",
        "ink-dark":   "#f4ecd8",
        "gold-dark":  "#d4af37",
        "emerald-dark":"#5da082",
        "rose-dark":  "#d27866",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        body:    ["Inter", "System", "sans-serif"],
        arabic:  ["Amiri", "serif"],
      },
      letterSpacing: {
        eyebrow: "0.09em",
      },
    },
  },
  plugins: [],
};
