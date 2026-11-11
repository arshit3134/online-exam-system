import { cx } from '../../utils/format';

export const Skeleton = ({ className }) => <div className={cx('skeleton', className)} aria-hidden="true" />;

export const CardSkeleton = ({ className = 'h-28' }) => <div className={cx('card p-5', className)}><Skeleton className="h-3 w-24 mb-4" /><Skeleton className="h-7 w-20" /></div>;

export const TableSkeleton = ({ rows = 5 }) => (
  <div className="card divide-y divide-line">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-4"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-1/5" /><Skeleton className="h-4 w-16 ml-auto" /></div>
    ))}
  </div>
);
