/** @type {import('tailwindcss').Config} */
export default {
  content: ['./apps/dashboard/index.html', './apps/dashboard/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0F2A4A',
          'navy-light': '#18385E',
          'navy-dark': '#0A1D33',
          blue: '#0284C7',
          'blue-light': '#38BDF8',
          'blue-dark': '#0369A1',
          teal: '#11806D',
          'teal-dark': '#0F6D5F',
          'teal-soft': '#E7F4F0'
        },
        surface: {
          app: 'var(--bg-app)',
          card: 'var(--bg-surface)',
          elevated: 'var(--bg-surface-elevated)',
          border: 'var(--border-neutral)'
        }
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro Display"',
          '"SF Pro"',
          'system-ui',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif'
        ],
        mono: [
          '"SF Mono"',
          'Menlo',
          'Monaco',
          'Consolas',
          '"JetBrains Mono"',
          'monospace'
        ]
      },
      zIndex: {
        60: '60',
        70: '70',
        80: '80',
        90: '90',
        100: '100',
        modal: '1000',
        popover: '2000',
        toast: '3000',
        tooltip: '4000',
        confirmation: '9999'
      },
      backdropBlur: {
        '2xs': '1px',
        xs: '2px'
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
      }
    },
  },
  plugins: [],
};
