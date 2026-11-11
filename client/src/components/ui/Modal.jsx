import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import Button from './Button';
import { cx } from '../../utils/format';

export function Modal({ open, onClose, title, children, footer, size = 'md', locked = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && !locked && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose, locked]);

  const width = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' }[size];
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
          <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !locked && onClose?.()} />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={cx('relative w-full card sm:rounded-2xl rounded-b-none max-h-[90vh] overflow-y-auto', width)}
          >
            <div className="flex items-center justify-between px-5 pt-5">
              <h3 className="text-base font-semibold">{title}</h3>
              {!locked && <button onClick={onClose} className="text-dim hover:text-fg p-1 -mr-1" aria-label="Close"><X className="h-5 w-5" /></button>}
            </div>
            <div className="px-5 py-4 text-sm text-mute">{children}</div>
            {footer && <div className="px-5 pb-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmText = 'Confirm', danger = false, loading = false, children }) {
  return (
    <Modal
      open={open} onClose={onClose} title={title} locked={loading}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>{confirmText}</Button>
        </>
      }
    >
      <div className="flex gap-3">
        {danger && <div className="h-9 w-9 rounded-full bg-bad/10 text-bad grid place-items-center shrink-0"><AlertTriangle className="h-5 w-5" /></div>}
        <div className="space-y-3">{message && <p>{message}</p>}{children}</div>
      </div>
    </Modal>
  );
}
