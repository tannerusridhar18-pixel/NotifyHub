/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1367d6',
          dark: '#0d55b2',
          soft: '#dcebff',
        },
        surface: '#f5f9ff',
        muted: '#c8d8f0',
      },
      boxShadow: {
        soft: '0 20px 42px rgba(17, 53, 108, 0.1)',
      },
      borderRadius: {
        xl: '28px',
      },
    },
  },
  plugins: [],
};
