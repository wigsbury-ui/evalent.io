import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Evalent brand palette — aligned with evalent.io marketing site
        // Primary: deep blue (#002ec1), Accent: bright blue (#2ea3f2)
        evalent: {
          50: "#eff4ff",
          100: "#dbe6fe",
          200: "#bfd3fe",
          300: "#93b4fd",
          400: "#6090fa",
          500: "#2ea3f2",   // Marketing site nav link blue
          600: "#0d52dd",   // Marketing site CTA hover
          700: "#002ec1",   // Marketing site primary CTA blue
          800: "#0a2699",
          900: "#0d2278",
          950: "#0a1652",
        },
        brand: {
          navy: "#0f172a",
          slate: "#1e293b",
          accent: "#2ea3f2",
        },
        status: {
          pending: "#f59e0b",
          scoring: "#8b5cf6",
          generating: "#3b82f6",
          sending: "#06b6d4",
          complete: "#22c55e",
          error: "#ef4444",
        },
      },
      fontFamily: {
        sans: ['"Open Sans"', "var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
        display: ['"Figtree"', "var(--font-display)", "Georgia", "serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
