import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          red: "#E31E24",
          "red-hover": "#FF2D35",
          "red-muted": "rgba(227, 30, 36, 0.12)",
          "red-glow": "rgba(227, 30, 36, 0.25)",
        },
        surface: {
          primary: "#0A0A0B",
          secondary: "#111113",
          tertiary: "#1A1A1F",
          elevated: "#222228",
          card: "#14141A",
          "card-hover": "#1C1C24",
          sidebar: "#0D0D0F",
        },
        border: {
          subtle: "#1F1F27",
          DEFAULT: "#2A2A35",
          strong: "#3A3A48",
        },
        txt: {
          primary: "#F5F5F7",
          secondary: "#8E8E9A",
          tertiary: "#5C5C6A",
        },
      },
      fontFamily: {
        display: ["var(--font-oswald)", "sans-serif"],
        body: ["var(--font-dm-sans)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(31,31,39,1)",
        brand: "0 4px 24px rgba(227,30,36,0.25)",
      },
      animation: {
        "fade-in": "fadeIn 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-up": "slideUp 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        shimmer: "shimmer 1.5s infinite ease-in-out",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
