import { forwardRef, useId } from 'react';
import { cx } from '../../utils/format';

const Wrapper = ({ label, error, hint, id, children }) => (
  <div>
    {label && <label htmlFor={id} className="label">{label}</label>}
    {children}
    {hint && !error && <p className="mt-1.5 text-xs text-dim">{hint}</p>}
    {error && <p className="mt-1.5 text-xs text-bad" role="alert">{error}</p>}
  </div>
);

export const Input = forwardRef(function Input({ label, error, hint, className, icon: Icon, ...rest }, ref) {
  const id = useId();
  return (
    <Wrapper label={label} error={error} hint={hint} id={id}>
      <div className="relative">
        {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dim pointer-events-none" />}
        <input id={id} ref={ref} className={cx('field', Icon && 'pl-10', error && 'border-bad focus:border-bad focus:ring-bad/25', className)} {...rest} />
      </div>
    </Wrapper>
  );
});

export const Textarea = forwardRef(function Textarea({ label, error, hint, className, rows = 3, ...rest }, ref) {
  const id = useId();
  return (
    <Wrapper label={label} error={error} hint={hint} id={id}>
      <textarea id={id} ref={ref} rows={rows} className={cx('field resize-y', error && 'border-bad', className)} {...rest} />
    </Wrapper>
  );
});

export const Select = forwardRef(function Select({ label, error, hint, className, children, ...rest }, ref) {
  const id = useId();
  return (
    <Wrapper label={label} error={error} hint={hint} id={id}>
      <select id={id} ref={ref} className={cx('field appearance-none bg-no-repeat pr-9', className)}
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%23A1A1AA' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundPosition: 'right 0.75rem center' }} {...rest}>
        {children}
      </select>
    </Wrapper>
  );
});
