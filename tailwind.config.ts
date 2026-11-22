import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEF4FF',
          100: '#DCE7FE',
          200: '#BACFFD',
          300: '#8AAEFB',
          400: '#5A86F6',
          500: '#3563EB',
          600: '#2349D3',
          700: '#1E3BAA',
          800: '#1E3486',
          900: '#1C2F6B',
        },
        ink: { DEFAULT: '#0F172A', soft: '#334155', mute: '#64748B' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,.04), 0 4px 16px rgba(15,23,42,.06)',
        sheet: '0 2px 6px rgba(15,23,42,.08), 0 18px 48px rgba(15,23,42,.12)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: { 'fade-in': 'fade-in .2s ease-out both' },
    },
  },
  plugins: [],
};
export default config;
