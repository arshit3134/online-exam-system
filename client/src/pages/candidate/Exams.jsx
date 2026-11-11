import { useState } from 'react';
import { ClipboardList, Search } from 'lucide-react';
import { candidateApi } from '../../services/endpoints';
import useFetch, { useDebounced } from '../../hooks/useFetch';
import { Input } from '../../components/ui/Field';
import { EmptyState, ErrorState, PageHeader, Pagination } from '../../components/ui/misc';
import { Skeleton } from '../../components/ui/Skeleton';
import ExamCard from '../../components/ExamCard';

export default function CandidateExams() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const { data, meta, loading, error, refetch } = useFetch(() => candidateApi.exams({ q: dq || undefined, page, limit: 9 }), [dq, page]);

  return (
    <>
      <PageHeader title="Available exams" subtitle="Choose an exam and begin when you are ready." />
      <div className="max-w-md mb-5"><Input icon={Search} placeholder="Search by title or subject" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div>
      {error ? <ErrorState message={error} onRetry={refetch} /> : loading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-60" />)}</div>
      ) : !data.length ? (
        <EmptyState icon={ClipboardList} title={dq ? 'No exams match your search' : 'No exams available yet'} description={dq ? 'Try a different keyword.' : 'Check back soon — your teacher has not published any exams.'} />
      ) : (
        <>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{data.map((e, i) => <ExamCard key={e._id} exam={e} index={i} />)}</div>
          <Pagination meta={meta} onPage={setPage} />
        </>
      )}
    </>
  );
}
