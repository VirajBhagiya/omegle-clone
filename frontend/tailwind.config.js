export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          blue: '#00f3ff',
          purple: '#8b3dff',
          pink: '#ff3d77',
          green: '#39ff14'
        },
        space: {
          dark: '#0a0a0f',
          light: '#16161f',
          accent: '#1f1f2e'
        }
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 }
        },
        glow: {
          '0%, 100%': {
            boxShadow: '0 0 20px #00f3ff, 0 0 30px #00f3ff, 0 0 40px #00f3ff'
          },
          '50%': {
            boxShadow: '0 0 10px #00f3ff, 0 0 20px #00f3ff, 0 0 30px #00f3ff'
          }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        }
      },
      animation: {
        glow: 'glow 2s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
      }
    }
  },
  plugins: [],
};