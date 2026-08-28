import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["Iowan Old Style", "Palatino Linotype", "Palatino", "Georgia", "serif"],
        heading: ["Iowan Old Style", "Palatino Linotype", "Palatino", "Georgia", "serif"],
      },
      colors: {
        background: "#f6f3ec",
        foreground: "#1e293b",
        card: {
          DEFAULT: "#fffcf7",
          foreground: "#1e293b",
        },
        popover: {
          DEFAULT: "#fffcf7",
          foreground: "#1e293b",
        },
        primary: {
          DEFAULT: "#0d9488",
          foreground: "#f4fffd",
        },
        secondary: {
          DEFAULT: "#e8efe9",
          foreground: "#1e293b",
        },
        muted: {
          DEFAULT: "#eee8dc",
          foreground: "#5b6573",
        },
        accent: {
          DEFAULT: "#d9f2ee",
          foreground: "#115e59",
        },
        destructive: {
          DEFAULT: "#b42318",
          foreground: "#fff7f6",
        },
        border: "#d9d1c3",
        input: "#d9d1c3",
        ring: "#0d9488",
        navy: {
          DEFAULT: "#1E293B",
          950: "#0B1220",
        },
        teal: {
          DEFAULT: "#0D9488",
          700: "#0F766E",
        },
        cream: "#F6F3EC",
        brass: "#B45309",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "4xl": "2rem",
      },
      ringWidth: {
        3: "3px",
      },
      boxShadow: {
        stamp: "0 0 0 1px rgba(13,148,136,0.25), 0 12px 40px -18px rgba(15,39,68,0.35)",
        ledger: "0 1px 0 rgba(15,39,68,0.06), 0 18px 50px -28px rgba(15,39,68,0.45)",
      },
      backgroundImage: {
        ledger:
          "linear-gradient(180deg, rgba(246,243,236,0.96), rgba(246,243,236,0.88)), radial-gradient(1200px 500px at 10% -10%, rgba(13,148,136,0.12), transparent), radial-gradient(900px 400px at 100% 0%, rgba(30,41,59,0.08), transparent)",
      },
    },
  },
  plugins: [],
};

export default config;
