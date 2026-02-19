/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0D9488', // Teal 600
        secondary: '#F59E0B', // Amber 500
        dark: '#1F2937',
        light: '#F3F4F6'
      }
    },
  },
  plugins: [],
}
