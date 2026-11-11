import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cx } from '../../utils/format';

const VARIANTS = {
  primary: 'bg-brand-gradient text-white shadow-glow hover:brightness-110',
  secondary: 'bg-card border border-line text-fg hover:bg-zinc-800 hover:border-zinc-600',
  ghost: 'text-mute hover:text-fg hover:bg-white/5',
  danger: 'bg-bad/10 border border-bad/30 text-bad hover:bg-bad/20',
  success: 'bg-ok/10 border border-ok/30 text-ok hover:bg-ok/20',
};
const SIZES = { sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg', md: 'px-4 py-2.5 text-sm gap-2 rounded-xl', lg: 'px-6 py-3 text-sm gap-2 rounded-xl' };

export default function Button({ variant = 'primary', size = 'md', loading, disabled, icon: Icon, children, className, type = 'button', ...rest }) {
  const off = disabled || loading;
  return (
    <motion.button
      type={type}
      whileHover={off ? undefined : { scale: 1.02 }}
      whileTap={off ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.12 }}
      disabled={off}
      className={cx(
        'inline-flex items-center justify-center font-medium transition-colors select-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60',
        VARIANTS[variant], SIZES[size], className
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </motion.button>
  );
}
