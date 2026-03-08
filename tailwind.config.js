/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: { primary: '#1a73e8', success: '#34a853', danger: '#ea4335', warning: '#fbbc04' },
      fontFamily: { sans: ['"Noto Sans JP"', 'sans-serif'] },
    },
  },
  plugins: [],
};
