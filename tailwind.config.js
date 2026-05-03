/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#073195',
          yellow: '#fec31d',
          cream: '#fff9e7',
          red: '#b82a29',
          green: '#114b23',
          ink: '#172033',
          muted: '#64748b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'podium-soft': '0 18px 48px rgba(7, 49, 149, 0.09)',
        'podium-lift': '0 24px 64px rgba(7, 49, 149, 0.14)',
        'podium-glass': '0 18px 50px rgba(7, 49, 149, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.86)',
      },
      backgroundImage: {
        'podium-mesh': 'radial-gradient(circle at 18% 14%, rgba(254, 195, 29, 0.24), transparent 28rem), radial-gradient(circle at 82% 8%, rgba(7, 49, 149, 0.13), transparent 30rem), linear-gradient(135deg, #fffdf5 0%, #fff9e7 45%, #fff7dc 100%)',
      },
      keyframes: {
        'podium-shimmer': {
          '0%': { backgroundPosition: '120% 0' },
          '100%': { backgroundPosition: '-120% 0' },
        },
      },
      animation: {
        'podium-shimmer': 'podium-shimmer 1.35s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
