import type { Config } from 'tailwindcss';

const config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        petal: {
          50: '#fff7f8',
          100: '#ffe8ec',
          200: '#ffcfd8',
          300: '#ffa5b5',
          400: '#fb7185',
          500: '#ef4f67',
          600: '#db2d4b',
          700: '#b91f3c',
          800: '#9a1d36',
          900: '#831d33',
        },
        herb: {
          50: '#f2fbf4',
          100: '#dff6e4',
          500: '#41a66b',
          700: '#2f7d50',
        },
        cocoa: {
          700: '#5e3b3f',
          900: '#301c20',
        },
      },
      boxShadow: {
        soft: '0 16px 36px -24px rgba(154, 29, 54, 0.45)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
