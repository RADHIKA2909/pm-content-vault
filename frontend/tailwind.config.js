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
        accent: '#F97316',
        'accent-light': '#FFF1E6',
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
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)',
        'card-hover': '0 6px 16px rgba(16,24,40,0.09), 0 2px 4px rgba(16,24,40,0.05)',
        raised: '0 2px 6px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)',
        // For a card the pointer is actually on. A touch deeper and softer than
        // card-hover, which is also used for menus and popovers that shouldn't
        // read as lifted off the page this far.
        lifted: '0 12px 28px rgba(16,24,40,0.13), 0 4px 8px rgba(16,24,40,0.06)',
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
        // Hero background shape. Very slow and very small — motion you notice
        // is motion that has failed at this opacity.
        drift: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(-12px,8px,0) scale(1.04)' },
        },
        // How a result enters: settle in place rather than slide. Used for
        // cards appearing after a filter change and for a just-saved item.
        cardIn: {
          '0%': { opacity: '0', transform: 'scale(0.98) translateY(4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        // Favourite star: overshoot once, then settle. The overshoot is the
        // whole point — a linear fill reads as a state change, not a reward.
        pop: {
          '0%': { transform: 'scale(0.6)' },
          '55%': { transform: 'scale(1.25)' },
          '100%': { transform: 'scale(1)' },
        },
        menuIn: {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(-4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        // Filter rail and mobile drawer.
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.2s ease-out',
        modalIn: 'modalIn 0.15s ease-out',
        pageIn: 'pageIn 0.25s ease-out',
        drift: 'drift 18s ease-in-out infinite',
        cardIn: 'cardIn 0.28s ease-out both',
        pop: 'pop 0.32s ease-out',
        menuIn: 'menuIn 0.13s ease-out',
        slideInRight: 'slideInRight 0.2s ease-out',
      },
    },
  },
  plugins: [typography],
}
