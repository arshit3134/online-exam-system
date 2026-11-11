import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { candidateApi } from '../../services/endpoints';
import useFetch from '../../hooks/useFetch';
import Button from '../../components/ui/Button';
import { EmptyState, ErrorState, PageHeader, PassBadge, Pagination } from '../../components/ui/misc';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { fmtDateTime, fmtNum, fmtPct } from '../../utils/format';

export default function CandidateResults() {
  const [page, setPage] = useState(1);
  const { data, meta, loading, error, refetch } = useFetch(() => candidateApi.results({ page, limit: 10 }), [page]);

  return (
    <>
      <PageHeader title="My results" subtitle="Every exam you have submitted." />
      {error ? <ErrorState message={error} onRetry={refetch} /> : loading ? <TableSkeleton /> : !data.length ? (
        <EmptyState icon={Trophy} title="No results yet" description="Once you submit an exam it will be listed here."
          action={<Link to="/candidate/exams"><Button>Browse exams</Button></Link>} />
      ) : (
        <>
          {/* table on larger screens */}
          <div className="card overflow-x-auto hidden md:block">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-line"><tr>
                <th className="th">Exam</th><th className="th">Attempted</th><th className="th">Marks</th><th className="th">Total</th><th className="th">Percentage</th><th className="th">Status</th><th className="th" />
              </tr></thead>
              <tbody className="divide-y divide-line">
                {data.map((r) => (
                  <tr key={r._id} className="hover:bg-white/[0.02]">
                    <td className="td"><p className="font-medium">{r.exam.title}</p><p className="text-xs text-dim">{r.exam.subject}{r.attemptNumber > 1 && ` · attempt #${r.attemptNumber}`}</p></td>
                    <td className="td text-mute whitespace-nowrap">{fmtDateTime(r.submittedAt)}</td>
                    <td className="td tabular-nums">{r.resultReleased ? fmtNum(r.score) : '—'}</td>
                    <td className="td tabular-nums">{r.resultReleased ? fmtNum(r.totalMarks) : '—'}</td>
                    <td className="td tabular-nums">{r.resultReleased ? fmtPct(r.percentage) : '—'}</td>
                    <td className="td"><PassBadge passed={r.passed} released={r.resultReleased} /></td>
                    <td className="td text-right"><Link to={`/candidate/results/${r._id}`}><Button size="sm" variant="secondary">View result</Button></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* cards on mobile */}
          <div className="md:hidden space-y-3">
            {data.map((r) => (
              <div key={r._id} className="card p-4">
                <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="font-medium truncate">{r.exam.title}</p><p className="text-xs text-dim">{fmtDateTime(r.submittedAt)}</p></div><PassBadge passed={r.passed} released={r.resultReleased} /></div>
                {r.resultReleased && <p className="text-sm text-mute mt-3 tabular-nums">{fmtNum(r.score)} / {fmtNum(r.totalMarks)} marks · {fmtPct(r.percentage)}</p>}
                <Link to={`/candidate/results/${r._id}`}><Button size="sm" variant="secondary" className="w-full mt-3">View result</Button></Link>
              </div>
            ))}
          </div>
          <Pagination meta={meta} onPage={setPage} />
        </>
      )}
    </>
  );
}
