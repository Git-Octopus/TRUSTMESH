/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tm: {
          navy: '#0F172A',
          charcoal: '#1E293B',
          blue: '#2563EB',
          teal: '#0EA5E9',
          verified: '#10B981',
          pending: '#F59E0B',
          rejected: '#EF4444',
          self: '#6B7280',
        }
      },
      fontFamily: {
        sans: ['Inter', 'IBM Plex Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'Roboto Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
