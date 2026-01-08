/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'electric-blue': '#00d4ff',
        'electric-purple': '#9d4edd',
        'tekken-red': '#ff1744',
        'tekken-gold': '#ffd700',
      },
      fontFamily: {
        'tekken': ['Orbitron', 'sans-serif'],
        'display': ['Bebas Neue', 'sans-serif'],
      },
      animation: {
        'electric-pulse': 'electric-pulse 0.5s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shake': 'shake 0.1s ease-in-out',
        'launch': 'launch 0.8s ease-out',
      },
      keyframes: {
        'electric-pulse': {
          '0%, 100%': { opacity: '1', filter: 'brightness(1)' },
          '50%': { opacity: '0.8', filter: 'brightness(1.5)' },
        },
        'glow': {
          '0%': { boxShadow: '0 0 20px #00d4ff, 0 0 40px #00d4ff' },
          '100%': { boxShadow: '0 0 40px #9d4edd, 0 0 80px #9d4edd' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        'launch': {
          '0%': { transform: 'translateY(0) rotate(0deg)' },
          '100%': { transform: 'translateY(-200px) rotate(-30deg)' },
        },
      },
    },
  },
  plugins: [],
}

