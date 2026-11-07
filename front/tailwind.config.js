/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // USnitch palette, usable directly as e.g. bg-geranium or text-rose
      colors: {
        rose: '#D7A49E', // Mellow Rose
        clay: '#A16963', // Wet Desert Clay
        ogre: '#FB503F', // Ogre Odor
        geranium: '#E4332D', // Permanent Geranium Lake
        'red-square': '#AB2528', // Red Square
        mantle: '#43333A', // Monastery Mantle
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['dark'],
  },
};
