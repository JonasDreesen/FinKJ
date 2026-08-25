/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f2f0ff',
          100: '#e6e2ff',
          200: '#c9c0ff',
          300: '#a595ff',
          400: '#8066ff',
          500: '#533afd',
          600: '#4527e8',
          700: '#371dbd',
          800: '#2c1994',
          900: '#1c1e54',
        },
      },
      borderRadius: {
        pill: '9999px',
      },
    },
  },
  plugins: [],
}
