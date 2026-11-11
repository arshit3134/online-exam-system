/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: '#09090B',
        surface: '#111114',
        card: '#18181B',
        line: '#27272A',
        brand: { DEFAULT: '#8B5CF6', soft: '#A78BFA' },
        brand2: '#6366F1',
        ok: '#22C55E',
        bad: '#EF4444',
        warn: '#F59E0B',
        fg: '#FAFAFA',
        mute: '#A1A1AA',
        dim: '#71717A',
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
        glow: '0 0 0 1px rgba(139,92,246,0.35), 0 8px 30px -8px rgba(139,92,246,0.45)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg,#8B5CF6 0%,#6366F1 100%)',
      },
    },
  },
  plugins: [],
};
