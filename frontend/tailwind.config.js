/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#090D16',       // Vercel/Linear style deep black-dark
          card: '#131B2E',     // Elevated glass card
          border: '#222F4C',   // Deep border
          input: '#1A243D',    // Deep input background
          text: '#F3F4F6',     // Light grey text
          muted: '#9CA3AF',    // Muted text
        },
        brand: {
          primary: '#6366F1',  // Indigo primary
          secondary: '#3B82F6',// Blue secondary
          accent: '#10B981',   // Emerald accent (success)
          warning: '#F59E0B',  // Amber warning
          error: '#EF4444'     // Red error
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-primary': '0 0 15px rgba(99, 102, 241, 0.3)',
        'glow-accent': '0 0 15px rgba(16, 185, 129, 0.3)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      }
    },
  },
  plugins: [],
}
