/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F4F1EA',
        surface: '#FBFAF6',
        ink: '#1B1B1A',
        muted: '#6E6B63',
        line: '#D9D4C7',
        accent: '#9A3B2E',
        'accent-soft': '#E9DBD5',
        moss: '#5F6B4E',
        sky: '#7A8C99'
      },
      fontFamily: {
        display: ['"Instrument Serif"', '"Zen Old Mincho"', 'serif'],
        body: ['"Zen Kaku Gothic New"', '"Inter Tight"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      letterSpacing: {
        wider2: '0.18em',
        wider3: '0.28em'
      }
    }
  },
  plugins: []
}
