/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary:          '#4e635a',
        'primary-fixed':  '#d1e8dd',
        'on-primary':     '#ffffff',
        secondary:        '#83523b',
        'secondary-cont': '#febea0',
        surface:          '#f2fbfd',
        'surface-low':    '#ecf5f8',
        'surface-high':   '#e0eaec',
        'on-surface':     '#141d1f',
        'on-surface-var': '#424845',
        outline:          '#727875',
        'outline-var':    '#c2c8c4',
        error:            '#ba1a1a',
        'error-cont':     '#ffdad6',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body:    ['Inter', 'sans-serif'],
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        soft: '0 4px 20px rgba(51,60,62,0.06)',
        card: '0 2px 8px rgba(51,60,62,0.04)',
      },
    },
  },
  plugins: [],
};
