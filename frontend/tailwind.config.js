/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gecotex: {
          navy: '#1F3864',
          'navy-dark': '#16294a',
          'navy-darker': '#0d1a30',
          blue: '#2E75B6',
          'blue-light': '#E8F1FA',
          bg: '#F4F6F9',
          border: '#E4E8EE',
          'border-soft': '#EEF1F5',
          ink: '#1A2233',
          'ink-sub': '#5B6577',
          'ink-muted': '#8893A4',
          green: '#27AE60',
          'green-soft': '#E8F6EE',
          orange: '#E67E22',
          'orange-soft': '#FDF0E2',
          red: '#C0392B',
          'red-soft': '#FBE7E4',
          // Legacy aliases for compatibility during migration
          primary: '#1F3864',
        },
        semaforo: {
          verde: '#27AE60',
          naranja: '#E67E22',
          rojo: '#C0392B',
          'verde-light': '#E8F6EE',
          'naranja-light': '#FDF0E2',
          'rojo-light': '#FBE7E4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'gx-sm': '0 1px 2px rgba(20,30,60,.04), 0 4px 16px rgba(20,30,60,.05)',
        'gx-lg': '0 4px 12px rgba(20,30,60,.06), 0 12px 32px rgba(20,30,60,.08)',
      }
    },
  },
  plugins: [],
}
