/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--bg)',
        foreground: 'var(--text)',
        'background-dark': 'var(--bg)',
        'foreground-dark': 'var(--text)',
      },
    },
  },
  plugins: [],
}