import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './content/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        onyx: {
          DEFAULT: '#0C0B0A',
          950: '#080706',
          900: '#0C0B0A',
          800: '#171412',
          700: '#2A241F',
          600: '#3D352E',
        },
        cream: {
          DEFAULT: '#F4EFE6',
          50: '#FBF8F2',
          100: '#F4EFE6',
          200: '#E8DFD0',
          300: '#D4C6B0',
        },
        fox: {
          DEFAULT: '#C56A2D',
          300: '#E8A36A',
          400: '#E08A4A',
          500: '#C56A2D',
          600: '#A35420',
          700: '#7A3C16',
        },
        ink: {
          DEFAULT: '#1C1917',
          muted: '#6B6560',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        lift: '0 22px 50px -24px rgba(12, 11, 10, 0.45)',
        panel: '0 24px 60px -20px rgba(12, 11, 10, 0.55)',
      },
      maxWidth: {
        content: '72rem',
      },
    },
  },
  plugins: [],
};

export default config;
