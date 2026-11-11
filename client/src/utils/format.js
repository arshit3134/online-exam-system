export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export const fmtDuration = (seconds = 0) => {
  const s = Math.max(Math.round(seconds), 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
};

export const fmtClock = (seconds = 0) => {
  const s = Math.max(Math.floor(seconds), 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

export const fmtNum = (n) => (Number.isInteger(n) ? String(n) : Number(n).toFixed(2).replace(/\.?0+$/, ''));
export const fmtPct = (n) => `${fmtNum(Number(n) || 0)}%`;
export const LETTERS = ['A', 'B', 'C', 'D'];
export const cx = (...c) => c.filter(Boolean).join(' ');
