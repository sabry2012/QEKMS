/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        mesh: {
          dark: '#06080f',
          card: 'rgba(255, 255, 255, 0.03)',
          border: 'rgba(255, 255, 255, 0.07)',
          hover: 'rgba(255, 255, 255, 0.05)',
        },
        primary: {
          cyan: '#06b6d4',
          blue: '#3b82f6',
        }
      },
      backgroundImage: {
        'mesh-gradient': 'linear-gradient(135deg, #06b6d4, #3b82f6)',
        'mesh-gradient-hover': 'linear-gradient(135deg, #08c8e9, #4f91fa)',
      },
      boxShadow: {
        'mesh-glow': '0 0 40px rgba(6, 182, 212, 0.15)',
        'mesh-glow-strong': '0 0 60px rgba(6, 182, 212, 0.25)',
        'inner-glow': 'inset 0 0 20px rgba(6, 182, 212, 0.05)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        }
      }
    },
  },
  plugins: [],
}
