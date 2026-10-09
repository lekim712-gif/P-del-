import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#effaf3', 100: '#d7f3e1', 200: '#b0e6c6', 300: '#7fd3a2', 400: '#4bba7c',
          500: '#27a05f', 600: '#18814b', 700: '#14673e', 800: '#125233', 900: '#0f432b',
        },
        accent: { 400: '#e8f04d', 500: '#d4dd1f', 600: '#a9b012' },
        ink: { 900: '#0f1f2e', 700: '#2b3d4f', 500: '#5b6b7b', 300: '#aab5c0', 100: '#e6ebf0', 50: '#f4f7f9' },
      },
      fontFamily: { sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'] },
    },
  },
  plugins: [],
};
export default config;
