import type { Config } from "tailwindcss";

/**
 * FarmGraph Rakshak design tokens — Rajasthan government-grade palette:
 * warm sandstone surfaces, deep ink navy authority, resilient crop green,
 * saffron attention, restrained red threat.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sand: {
          50: "#faf7f1", 100: "#f4efe3", 200: "#e9e1cf", 300: "#d9cdb2", 400: "#c4b393",
        },
        ink: {
          950: "#101a2e", 900: "#17233b", 800: "#1f2f4f", 700: "#2b3a58", 600: "#3d4f74", 500: "#5a6c90", 400: "#8595b0",
        },
        leaf: {
          700: "#27692f", 600: "#2f7d3a", 500: "#3f9a4d", 100: "#dcefdc", 50: "#eef7ef",
        },
        saffron: {
          700: "#a85e00", 600: "#c77400", 500: "#e08a00", 100: "#fbeed3", 50: "#fdf6e9",
        },
        alert: {
          700: "#b3261e", 600: "#c93b31", 100: "#fbe3e1", 50: "#fdf1f0",
        },
        slate2: "#5b6472",
      },
      fontFamily: {
        sans: [
          "system-ui", "-apple-system", "Segoe UI", "Noto Sans", "Noto Sans Devanagari",
          "Roboto", "Helvetica Neue", "Arial", "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,26,46,0.08)",
        lift: "0 4px 14px rgba(16,26,46,0.12)",
      },
      borderRadius: { card: "10px" },
    },
  },
  plugins: [],
};

export default config;
