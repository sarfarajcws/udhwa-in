/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./**/*.{html,js}"],
  theme: {
    extend: {
          fontFamily: {
            display: ['Playfair Display', 'serif'],
            body: ['DM Sans', 'sans-serif'],
          },
          colors: {
            ink: '#0a0a0a',
            'ink-light': '#3a3a3a',
            'ink-muted': '#6b6b6b',
            cream: '#faf9f6',
            'cream-dark': '#f0ede6',
            glass: 'rgba(255,255,255,0.6)',
          },
          backdropBlur: {
            xs: '2px',
          },
          animation: {
            'fade-up': 'fadeUp 0.7s ease both',
            'fade-in': 'fadeIn 0.5s ease both',
          },
          keyframes: {
            fadeUp: {
              '0%': { opacity: 0, transform: 'translateY(24px)' },
              '100%': { opacity: 1, transform: 'translateY(0)' },
            },
            fadeIn: {
              '0%': { opacity: 0 },
              '100%': { opacity: 1 },
            },
          },
        },
  },
  plugins: [],
}

