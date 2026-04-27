/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "var(--green-primary)",
        "primary-dark": "#16a34a",
        "primary-light": "#86efac",
        secondary: "#f97316",
        "secondary-dark": "#ea580c",
        water: "var(--blue-primary)",
        "water-dark": "#2563eb",
        "water-light": "#93c5fd",
        background: "var(--bg-page)",
        card: "var(--surface-1)",
        text: "var(--text-primary)",
        muted: "var(--text-muted)",
        border: "var(--border-default)",
        danger: "#ef4444",
      },
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.06)",
        "card-hover":
          "0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};
