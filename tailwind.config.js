/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        background: '#0C0E14',
        surface: '#13161F',
        'border-subtle': '#1E2130',
        'text-primary': '#E8EAF0',
        'text-secondary': '#5A6080',
        accent: '#E8A838',
        danger: '#E05A5A',
        success: '#4CAF82',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
