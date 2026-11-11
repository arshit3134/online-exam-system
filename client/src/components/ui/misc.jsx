import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Inbox, AlertCircle } from 'lucide-react';
import Button from './Button';
import { cx } from '../../utils/format';

const TONES = {
  neutral: 'bg-zinc-800 text-mute border-line',
  brand: 'bg-brand/10 text-brand-soft border-brand/30',
  ok: 'bg-ok/10 text-ok border-ok/30',
  bad: 'bg-bad/10 text-bad border-bad/30',
  warn: 'bg-warn/10 text-warn border-warn/30',
};
export const Badge = ({ tone = 'neutral', children, className, dot }) => (
  <span className={cx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap', TONES[tone], className)}>
    {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
    {children}
  </span>
);

export const EmptyState = ({ icon: Icon = Inbox, title, description, action }) => (
  <div className="card flex flex-col items-center text-center px-6 py-14">
    <div className="h-12 w-12 rounded-2xl bg-brand/10 text-brand-soft grid place-items-center mb-4"><Icon className="h-6 w-6" /></div>
    <h3 className="font-semibold">{title}</h3>
    {description && <p className="text-sm text-mute mt-1.5 max-w-sm">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const ErrorState = ({ message, onRetry }) => (
  <div className="card flex flex-col items-center text-center px-6 py-12">
    <div className="h-12 w-12 rounded-2xl bg-bad/10 text-bad grid place-items-center mb-4"><AlertCircle className="h-6 w-6" /></div>
    <h3 className="font-semibold">Something went wrong</h3>
    <p className="text-sm text-mute mt-1.5 max-w-sm">{message}</p>
    {onRetry && <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>Try again</Button>}
  </div>
);

export const Pagination = ({ meta, onPage }) => {
  if (!meta || meta.pages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4 text-sm text-mute">
      <span>Page {meta.page} of {meta.pages} · {meta.total} total</span>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>Prev</Button>
        <Button variant="secondary" size="sm" disabled={meta.page >= meta.pages} onClick={() => onPage(meta.page + 1)}>Next<ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
};

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-mute mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);

export const StatCard = ({ label, value, sub, icon: Icon, tone = 'brand', index = 0 }) => {
  const tones = { brand: 'bg-brand/10 text-brand-soft', ok: 'bg-ok/10 text-ok', bad: 'bg-bad/10 text-bad', warn: 'bg-warn/10 text-warn', blue: 'bg-brand2/15 text-indigo-300' };
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: index * 0.05 }}
      className="card card-hover p-5"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-mute">{label}</p>
        {Icon && <span className={cx('h-8 w-8 rounded-lg grid place-items-center', tones[tone])}><Icon className="h-4 w-4" /></span>}
      </div>
      <p className="text-2xl font-bold mt-3 tracking-tight tabular-nums">{value}</p>
      {sub && <p className="text-xs text-dim mt-1">{sub}</p>}
    </motion.div>
  );
};

export const Section = ({ title, subtitle, actions, children, className }) => (
  <section className={cx('card p-5', className)}>
    <div className="flex items-start justify-between gap-3 mb-4">
      <div><h2 className="font-semibold">{title}</h2>{subtitle && <p className="text-xs text-dim mt-0.5">{subtitle}</p>}</div>
      {actions}
    </div>
    {children}
  </section>
);

export const Spinner = ({ className }) => <div className={cx('h-5 w-5 rounded-full border-2 border-line border-t-brand animate-spin', className)} />;
export const FullPageSpinner = () => <div className="min-h-screen grid place-items-center"><Spinner className="h-8 w-8" /></div>;

export const Logo = ({ className }) => (
  <div className={cx('flex items-center gap-2.5', className)}>
    <div className="h-8 w-8 rounded-lg bg-brand-gradient grid place-items-center shadow-glow">
      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 h-[18px] w-[18px]" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
    </div>
    <span className="font-bold tracking-tight text-[17px]">Exam<span className="gradient-text">Flow</span></span>
  </div>
);

export const PassBadge = ({ passed, released = true }) => {
  if (!released) return <Badge tone="warn" dot>Awaiting release</Badge>;
  return passed ? <Badge tone="ok" dot>Passed</Badge> : <Badge tone="bad" dot>Failed</Badge>;
};

export const ProgressBar = ({ value, tone = 'brand' }) => (
  <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} transition={{ duration: 0.7, ease: 'easeOut' }}
      className={cx('h-full rounded-full', tone === 'bad' ? 'bg-bad' : tone === 'ok' ? 'bg-ok' : 'bg-brand-gradient')} />
  </div>
);
