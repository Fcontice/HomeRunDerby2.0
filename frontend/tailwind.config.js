/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  safelist: [
    'bg-accent-amber', 'border-accent-amber/40', 'text-accent-amber',
    'bg-accent-blue', 'border-accent-blue/30', 'text-accent-blue',
    'bg-accent-green', 'border-accent-green/40', 'text-accent-green',
    'border-border',
    // Player tier classes
    'bg-accent-amber/15', 'bg-accent-amber/5', 'border-accent-amber/30', 'border-accent-amber/50',
    'bg-accent-blue/15', 'bg-accent-blue/20', 'border-accent-blue/20', 'border-accent-blue/40',
    'text-surface-base',
    'hover:border-accent-amber/50', 'hover:border-accent-blue/40', 'hover:border-white/20',
    'glow-amber', 'glow-blue',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        gold: {
          DEFAULT: 'hsl(var(--gold))',
          foreground: 'hsl(var(--gold-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        // HRD design tokens
        brand: {
          red: 'hsl(var(--brand-red))',
          'red-dark': 'hsl(var(--brand-red-dark))',
        },
        'accent-green': 'hsl(var(--accent-green))',
        'accent-blue': 'hsl(var(--accent-blue))',
        'accent-amber': 'hsl(var(--accent-amber))',
        surface: {
          base: 'hsl(var(--surface-base))',
          card: 'hsl(var(--surface-card))',
          deep: 'hsl(var(--surface-deep))',
          elevated: 'hsl(var(--surface-elevated))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out forwards',
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'scale-in': 'scale-in 0.3s ease-out forwards',
        'firework-burst': 'firework-burst 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'jumbotron-flash': 'jumbotron-flash 0.3s ease-out',
        'progress-fill': 'progress-fill 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'holographic-sheen': 'holographic-sheen 3s ease-in-out infinite',
      },
      keyframes: {
        'firework-burst': {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '50%': { transform: 'scale(1.2)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'jumbotron-flash': {
          '0%': { opacity: '1' },
          '50%': { opacity: '0.6' },
          '100%': { opacity: '1' },
        },
        'progress-fill': {
          '0%': { width: '0%' },
          '100%': { width: 'var(--progress-width, 100%)' },
        },
        'holographic-sheen': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
