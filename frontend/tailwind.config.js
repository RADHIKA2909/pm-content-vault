import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366F1',
          hover: '#5458E8',
          light: '#EEF2FF',
        },
        secondary: '#14B8A6',
        warning: '#F59E0B',
        success: '#10B981',
        'border-subtle': '#ECECF2',
        'text-primary': '#1F2937',
        'text-secondary': '#6B7280',
        surface: '#FFFFFF',
        'bg-app': '#FAFAFC',
        muted: '#F4F5F8',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        body: '15px',
        caption: '13px',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        modalIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pageIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.2s ease-out',
        modalIn: 'modalIn 0.15s ease-out',
        pageIn: 'pageIn 0.25s ease-out',
      },
    },
  },
  plugins: [typography],
}
