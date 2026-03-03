import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        syne: ["Syne", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
      colors: {
        bg: "hsl(220, 15%, 6%)",
        surface: "hsl(220, 12%, 10%)",
        "surface-2": "hsl(220, 10%, 14%)",
        accent: "hsl(160, 90%, 52%)",
        amber: "hsl(38, 95%, 55%)",
        danger: "hsl(0, 85%, 60%)",
        "text-base": "hsl(220, 20%, 75%)",
        "text-dim": "hsl(220, 10%, 45%)",
        border: "hsl(220, 15%, 16%)",
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease-out forwards",
        pulse2: "pulse2 2s ease-in-out infinite",
        "stream": "stream 0.4s ease-out forwards",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulse2: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        stream: {
          "0%": { opacity: "0", transform: "translateX(-6px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
