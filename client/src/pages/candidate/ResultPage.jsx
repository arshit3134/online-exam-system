import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Lock } from 'lucide-react';
import { candidateApi } from '../../services/endpoints';
import useFetch from '../../hooks/useFetch';
import { ErrorState } from '../../components/ui/misc';
import { Skeleton } from '../../components/ui/Skeleton';
import ResultView from '../../components/ResultView';
import { fmtDateTime, fmtDuration } from '../../utils/format';

export default function ResultPage() {
  const { id } = useParams();
  const { data, loading, error, refetch } = useFetch(() => candidateApi.result(id), [id]);

  return (
    <>
      <Link to="/candidate/results" className="text-xs text-mute hover:text-fg inline-flex items-center gap-1 mb-3"><ArrowLeft className="h-3.5 w-3.5" />My results</Link>
      {error ? <ErrorState message={error} onRetry={refetch} /> : loading ? (
        <div className="space-y-4"><Skeleton className="h-10 w-80" /><Skeleton className="h-72" /><Skeleton className="h-64" /></div>
      ) : (
        <>
          <h1 className="text-2xl font-bold tracking-tight">{data.exam.title}</h1>
          <p className="text-sm text-mute mt-1 mb-6">{data.exam.subject} · Submitted {fmtDateTime(data.attempt.submittedAt)}{data.attempt.autoSubmitted && ' (auto-submitted when time ran out)'}</p>
          {data.released ? <ResultView data={data} /> : (
            <div className="card flex flex-col items-center text-center px-6 py-16">
              <div className="h-14 w-14 rounded-2xl bg-warn/10 text-warn grid place-items-center mb-4"><Lock className="h-7 w-7" /></div>
              <h2 className="text-lg font-semibold flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-ok" />Your exam was submitted</h2>
              <p className="text-sm text-mute mt-2 max-w-md">Your teacher has not released the results yet. Your score, the correct answers and explanations will appear here as soon as they are released.</p>
              <p className="text-xs text-dim mt-4">Time taken: {fmtDuration(data.attempt.timeTaken)}</p>
            </div>
          )}
        </>
      )}
    </>
  );
}
