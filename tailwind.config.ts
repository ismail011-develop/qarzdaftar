import type { Config } from "tailwindcss";

// Design tokens taken from the approved prototype (design/qarzdaftar-prototype.html).
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        qd: {
          bg: "#04100c", card: "#0d1f19", card2: "#122a21", line: "#173226",
          green: "#22e07a", emerald: "#10b981", text: "#e8fff3", mute: "#7fa594",
          red: "#ff5d6c", amber: "#f5b942",
        },
      },
      borderRadius: { qd: "18px" },
      boxShadow: { glow: "0 10px 30px rgba(16,185,129,.15)" },
    },
  },
  plugins: [],
};
export default config;
