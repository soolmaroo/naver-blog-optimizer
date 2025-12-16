/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        clinicGreen: {
          50: '#f1f7f2',
          100: '#d9eadf',
          200: '#b4d6be',
          300: '#8fc19d',
          400: '#6aac7c',
          500: '#46875a',
          600: '#386b47',
          700: '#2a4f35',
          800: '#1c3323',
          900: '#0e1811'
        }
      }
    }
  },
  plugins: []
};

