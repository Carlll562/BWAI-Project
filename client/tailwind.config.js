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
          dark: '#09090b',       // bg-zinc-950
          card: '#18181b',       // bg-zinc-900
          border: '#27272a',     // border-zinc-800
        },
        gradient: {
          start: '#6366f1',      // Indigo 500
          end: '#8b5cf6',        // Violet 500
        },
        status: {
          approved: '#10b981',   // Emerald 500
          hardConflict: '#f43f5e',// Rose 500
          softConflict: '#f59e0b',// Amber 500
          pending: '#3b82f6',     // Blue 500
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
