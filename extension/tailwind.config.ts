import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./popup.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#4913ec',
        'background-light': '#f6f6f8',
        'background-dark': '#151022',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
