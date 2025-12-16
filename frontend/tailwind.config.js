/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0b5b3f',
        clinicGreen: {
          50: '#f0f9f7',
          100: '#d1f0e8',
          200: '#a3e1d1',
          300: '#6fc9b5',
          400: '#3fa892',
          500: '#1d8d75',
          600: '#0b5b3f',
          700: '#094a33',
          800: '#0a3d2a',
          900: '#0a3224',
        },
      },
    },
  },
  plugins: [],
};
