import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { teacherApi } from '../../services/endpoints';
import useFetch from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import { Badge, ErrorState } from '../../components/ui/misc';
import { Skeleton } from '../../components/ui/Skeleton';
import ResultView from '../../components/ResultView';

export default function TeacherAttempt() {
  const { id } = useParams();
  const toast = useToast();
  const { data, loading, error, refetch, reload } = useFetch(() => teacherApi.attempt(id), [id]);

  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (loading) return <div className="space-y-4"><Skeleton className="h-12 w-72" /><Skeleton className="h-64" /><Skeleton className="h-64" /></div>;

  const toggle = async () => {
    try { await teacherApi.releaseAttempt(id, !data.resultReleased); toast.success(data.resultReleased ? 'Result hidden from student' : 'Result released to student'); reload(); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <>
      <Link to={`/teacher/exams/${data.exam._id}`} className="text-xs text-mute hover:text-fg inline-flex items-center gap-1 mb-3"><ArrowLeft className="h-3.5 w-3.5" />{data.exam.title}</Link>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{data.candidate.name}</h1>
          <p className="text-sm text-mute mt-1">{data.candidate.email} · Attempt #{data.attempt.attemptNumber}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={data.resultReleased ? 'ok' : 'warn'} dot>{data.resultReleased ? 'Visible to student' : 'Hidden from student'}</Badge>
          <Button variant="secondary" icon={data.resultReleased ? EyeOff : Eye} onClick={toggle}>{data.resultReleased ? 'Hide result' : 'Release result'}</Button>
        </div>
      </div>
      <ResultView data={data} teacherView />
    </>
  );
}
