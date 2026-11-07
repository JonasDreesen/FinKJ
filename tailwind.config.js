/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  safelist: ['text-income', 'text-expense'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        line: token('line'),
        ink: token('ink'),
        muted: token('muted'),
        income: token('income'),
        expense: token('expense'),
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
        '4xl': '2rem',
      },
      boxShadow: {
        card: '0 1px 2px rgb(16 24 40 / 0.04), 0 4px 16px -4px rgb(16 24 40 / 0.08)',
        lift: '0 8px 24px -6px rgb(83 58 253 / 0.45)',
        sheet: '0 -8px 40px -8px rgb(16 24 40 / 0.25)',
      },
      spacing: {
        safe: 'env(safe-area-inset-bottom)',
      },
      keyframes: {
        'sheet-in': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'dialog-in': {
          from: { opacity: 0, transform: 'translateY(8px) scale(.98)' },
          to: { opacity: 1, transform: 'none' },
        },
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'toast-in': { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'none' } },
      },
      animation: {
        'sheet-in': 'sheet-in .28s cubic-bezier(.32,.72,0,1)',
        'dialog-in': 'dialog-in .2s ease-out',
        'fade-in': 'fade-in .2s ease-out',
        'toast-in': 'toast-in .25s ease-out',
      },
    },
  },
  plugins: [],
}
