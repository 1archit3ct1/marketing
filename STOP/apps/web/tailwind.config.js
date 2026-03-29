/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // AURA Brand Colors - Dark First Design System
        background: 'var(--color-bg)',
        panel: 'var(--color-panel)',
        accent: {
          purple: 'var(--color-accent-purple)',
          green: 'var(--color-accent-green)',
          orange: 'var(--color-accent-orange)'
        },
        border: 'var(--color-border)',
        muted: 'var(--color-muted)',
        foreground: 'var(--color-foreground)'
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif']
      },
      spacing: {
        '4xs': '0.125rem',
        '3xs': '0.25rem',
        '2xs': '0.375rem',
        'xs': '0.5rem',
        'sm': '0.75rem',
        'md': '1rem',
        'lg': '1.25rem',
        'xl': '1.5rem',
        '2xl': '2rem',
        '3xl': '2.5rem',
        '4xl': '3rem'
      }
    }
  },
  plugins: []
}
