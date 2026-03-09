import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Without this, the 'text-web3-cyan' class referenced in your CSS won't work.
        "web3-cyan": "#22D3EE",
        "web3-purple": "#A78BFA",
      },
      boxShadow: {
        "glow": "0 0 20px rgba(34, 211, 238, 0.3)",
        "neon-cyan": "0 0 10px rgba(34, 211, 238, 0.4), 0 0 20px rgba(34, 211, 238, 0.2)",
        "neon-purple": "0 0 10px rgba(167, 139, 250, 0.4), 0 0 20px rgba(167, 139, 250, 0.2)"
      },
    },
  },
  plugins: [],
};
export default config;
