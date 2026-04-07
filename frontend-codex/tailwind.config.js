/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Unbounded"', "system-ui", "sans-serif"],
        sans: ['"Space Grotesk"', "system-ui", "sans-serif"],
      },
      colors: {
        obsidian: "#0a0a0f",
        graphite: "#14141c",
        ember: "#ff6a2a",
        auric: "#f2c96c",
        neon: "#3ef0d6",
        steel: "#2b313b",
      },
      backgroundImage: {
        "forge-linear":
          "linear-gradient(140deg, rgba(10, 10, 15, 1) 0%, rgba(18, 18, 28, 1) 50%, rgba(8, 8, 14, 1) 100%)",
        "forge-radial":
          "radial-gradient(circle at 20% 20%, rgba(255, 106, 42, 0.22), transparent 55%), radial-gradient(circle at 80% 10%, rgba(62, 240, 214, 0.15), transparent 45%), radial-gradient(circle at 40% 80%, rgba(242, 201, 108, 0.18), transparent 55%)",
      },
      boxShadow: {
        forge: "0 0 80px rgba(255, 106, 42, 0.22)",
        neon: "0 0 60px rgba(62, 240, 214, 0.24)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -16px, 0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        grain: {
          "0%": { transform: "translate(0,0)" },
          "25%": { transform: "translate(-4%, 6%)" },
          "50%": { transform: "translate(6%, -4%)" },
          "75%": { transform: "translate(-3%, 4%)" },
          "100%": { transform: "translate(0,0)" },
        },
      },
      animation: {
        float: "float 12s ease-in-out infinite",
        marquee: "marquee 18s linear infinite",
        grain: "grain 9s steps(8) infinite",
      },
    },
  },
  plugins: [],
};
