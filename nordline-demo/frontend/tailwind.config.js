/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "nordline-blue": "#0a3d62",
        "nordline-teal": "#1a7a6e",
        "nordline-light": "#e8f4f3",
        "nordline-gold": "#e8a838",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
