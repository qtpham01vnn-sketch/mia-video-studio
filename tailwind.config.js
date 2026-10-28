/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
        display: ['"Montserrat"', '"Be Vietnam Pro"', 'sans-serif'],
      },
      colors: {
        brand: {
          navy: '#0a1128',
          dark: '#060b19',
          card: '#111a36',
          gold: '#f5b942',
          goldLight: '#ffe082',
          cyan: '#38bdf8',
          purple: '#a855f7',
        }
      }
    },
  },
  plugins: [],
}
