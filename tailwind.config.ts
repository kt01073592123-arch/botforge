import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "#0a0c10",
        panel: "#11141b",
        border: "#1c2230",
        text: "#e6ecf2",
        muted: "#7d8696",
        accent: "#7c5cff",
        accent2: "#19c37d",
        danger: "#ef4444",
        success: "#22c55e",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
