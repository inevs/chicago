/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./apps/dividends/src/**/*.{html,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: {
          850: '#1e293b',
          900: '#0f172a',
          950: '#020617'
        },
      },
    },
  },
  plugins: [],
};
