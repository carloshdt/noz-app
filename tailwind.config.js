/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#FAF6F1',
        surface: '#F0E8DC',
        primary: '#8B4513',
        accent: '#6B7C5C',
        text: '#2C1810',
        muted: '#8C7B6B',
        border: '#D4C4B0',
      },
      fontFamily: {
        serif: ['PlayfairDisplay_700Bold'],
        sans: ['Inter_400Regular'],
        'sans-medium': ['Inter_500Medium'],
        'sans-bold': ['Inter_700Bold'],
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
};
