import { useState } from 'react';
import { Search, Users } from 'lucide-react';
import { teacherApi } from '../../services/endpoints';
import useFetch, { useDebounced } from '../../hooks/useFetch';
import { Input } from '../../components/ui/Field';
import { EmptyState, ErrorState, PageHeader, Pagination } from '../../components/ui/misc';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { fmtDate, fmtPct } from '../../utils/format';

export default function Students() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const { data, meta, loading, error, refetch } = useFetch(() => teacherApi.students({ q: dq || undefined, page, limit: 10 }), [dq, page]);

  return (
    <>
      <PageHeader title="Students" subtitle="Everyone registered as a candidate, with their performance on your exams." />
      <div className="max-w-sm mb-4"><Input icon={Search} placeholder="Search by name or email" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div>
      {error ? <ErrorState message={error} onRetry={refetch} /> : loading ? <TableSkeleton /> : !data.length ? (
        <EmptyState icon={Users} title="No students found" description={dq ? 'Try a different search term.' : 'Students appear here once they register.'} />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead><tr className="border-b border-line"><th className="th">Student</th><th className="th">Joined</th><th className="th">Attempts</th><th className="th">Average</th><th className="th">Best</th><th className="th">Passed</th><th className="th">Last attempt</th></tr></thead>
              <tbody className="divide-y divide-line">
                {data.map((s) => (
                  <tr key={s._id} className="hover:bg-white/[0.02]">
                    <td className="td"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-brand-gradient grid place-items-center text-xs font-bold">{s.name[0]}</div><div><p className="font-medium">{s.name}</p><p className="text-xs text-dim">{s.email}</p></div></div></td>
                    <td className="td text-mute whitespace-nowrap">{fmtDate(s.joinedAt)}</td>
                    <td className="td tabular-nums">{s.attempts}</td>
                    <td className="td tabular-nums">{s.attempts ? fmtPct(s.averagePercentage) : '—'}</td>
                    <td className="td tabular-nums">{s.attempts ? fmtPct(s.bestPercentage) : '—'}</td>
                    <td className="td tabular-nums">{s.passed}/{s.attempts}</td>
                    <td className="td text-dim whitespace-nowrap">{fmtDate(s.lastAttemptAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={meta} onPage={setPage} />
        </>
      )}
    </>
  );
}
