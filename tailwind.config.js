/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#020818',
          900: '#040d24',
          800: '#071133',
          700: '#0a1a4a',
          600: '#0d2260',
        },
        arcane: {
          900: '#1a0a2e',
          800: '#230d3d',
          700: '#2d1050',
          600: '#3d1568',
          500: '#5a1f96',
          400: '#7b2ec8',
          300: '#9b4de8',
          200: '#c087f5',
        },
        gold: {
          900: '#3d2800',
          800: '#6b4500',
          700: '#996200',
          600: '#c87e00',
          500: '#f59e0b',
          400: '#fbbf24',
          300: '#fcd34d',
          200: '#fde68a',
          100: '#fef3c7',
        },
        rune: {
          cyan: '#00e5ff',
          teal: '#00bfa5',
          emerald: '#00e676',
          red: '#ff1744',
          orange: '#ff6d00',
        }
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['Crimson Pro', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
        ui: ['Rajdhani', 'sans-serif'],
      },
      animation: {
        'portal-pulse': 'portalPulse 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'radar-sweep': 'radarSweep 2s linear infinite',
        'xp-fill': 'xpFill 1s ease-out forwards',
        'battle-shake': 'battleShake 0.5s ease-in-out',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'particle-drift': 'particleDrift 8s ease-in-out infinite',
        'level-burst': 'levelBurst 0.8s ease-out forwards',
        'scan-line': 'scanLine 3s linear infinite',
      },
      keyframes: {
        portalPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(245,158,11,0.3), inset 0 0 20px rgba(245,158,11,0.05)' },
          '50%': { boxShadow: '0 0 40px rgba(245,158,11,0.6), inset 0 0 40px rgba(245,158,11,0.1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        particleDrift: {
          '0%': { transform: 'translateY(0) translateX(0)', opacity: '0' },
          '10%': { opacity: '0.8' },
          '90%': { opacity: '0.2' },
          '100%': { transform: 'translateY(-100px) translateX(30px)', opacity: '0' },
        },
        levelBurst: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(2.5)', opacity: '0.8' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
        scanLine: {
          '0%': { top: '0%' },
          '100%': { top: '100%' },
        },
        battleShake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        xpFill: {
          '0%': { width: '0%' },
        },
      },
      backgroundImage: {
        'arcane-gradient': 'linear-gradient(135deg, #020818 0%, #1a0a2e 50%, #040d24 100%)',
        'gold-gradient': 'linear-gradient(135deg, #f59e0b, #fbbf24, #f59e0b)',
        'portal-radial': 'radial-gradient(ellipse at center, rgba(245,158,11,0.15) 0%, transparent 70%)',
      },
    },
  },
  plugins: [],
}
