import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./pages/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#C81E1E",   // merah elegan (button utama)
          primaryDark: "#991B1B",
          accent: "#FACC15",    // emas (highlight)
        },
      },
      boxShadow: {
        soft: "0 6px 24px rgba(0,0,0,0.08)",
      },
      borderRadius: {
        xl2: "1rem",
      },
    },
  },
  plugins: [],
}
export default config