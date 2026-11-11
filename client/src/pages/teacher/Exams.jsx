import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Eye, FileText, HelpCircle, Pencil, Plus, Search, Trash2, Users, EyeOff } from 'lucide-react';
import { teacherApi } from '../../services/endpoints';
import useFetch, { useDebounced } from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Field';
import { ConfirmModal } from '../../components/ui/Modal';
import { Badge, EmptyState, ErrorState, PageHeader, Pagination } from '../../components/ui/misc';
import { Skeleton } from '../../components/ui/Skeleton';
import { fmtDate, fmtNum, fmtPct } from '../../utils/format';

export default function TeacherExams() {
  const toast = useToast();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const dq = useDebounced(q);
  const { data, meta, loading, error, refetch, reload } = useFetch(
    () => teacherApi.exams({ q: dq || undefined, status: status || undefined, page, limit: 9 }), [dq, status, page]
  );

  const toggle = async (exam) => {
    const next = exam.status === 'published' ? 'draft' : 'published';
    try {
      await teacherApi.setStatus(exam._id, next);
      toast.success(next === 'published' ? 'Exam published' : 'Exam moved to drafts');
      reload();
    } catch (e) { toast.error(e.message); }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await teacherApi.deleteExam(toDelete._id);
      toast.success('Exam deleted');
      setToDelete(null);
      reload();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Exams" subtitle="Create, publish and manage your examinations."
        actions={<Link to="/teacher/exams/new"><Button icon={Plus}>New exam</Button></Link>} />
      <div className="grid sm:grid-cols-[1fr_200px] gap-3 mb-5 max-w-2xl">
        <Input icon={Search} placeholder="Search title or subject" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option><option value="published">Published</option><option value="draft">Draft</option>
        </Select>
      </div>

      {error ? <ErrorState message={error} onRetry={refetch} /> : loading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56" />)}</div>
      ) : !data.length ? (
        <EmptyState icon={FileText} title={dq || status ? 'No exams match your filters' : 'No exams yet'} description={dq || status ? 'Try adjusting the search or filter.' : 'Create your first MCQ exam to get started.'}
          action={!dq && !status && <Link to="/teacher/exams/new"><Button icon={Plus}>Create exam</Button></Link>} />
      ) : (
        <>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.map((e, i) => (
              <motion.div key={e._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="card card-hover p-5 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <Badge tone={e.status === 'published' ? 'ok' : 'neutral'} dot>{e.status === 'published' ? 'Published' : 'Draft'}</Badge>
                  <span className="text-xs text-dim">{fmtDate(e.createdAt)}</span>
                </div>
                <Link to={`/teacher/exams/${e._id}`} className="mt-3 font-semibold text-lg leading-snug hover:text-brand-soft transition-colors line-clamp-2">{e.title}</Link>
                <p className="text-sm text-mute mt-0.5">{e.subject}</p>
                <div className="grid grid-cols-2 gap-y-2 gap-x-3 mt-4 text-xs text-mute">
                  <span className="flex items-center gap-1.5"><HelpCircle className="h-3.5 w-3.5 text-dim" />{e.questionCount} questions</span>
                  <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-dim" />{e.duration} min</span>
                  <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-dim" />{e.attemptCount} attempts</span>
                  <span className="flex items-center gap-1.5 tabular-nums">{fmtNum(e.totalMarks)} marks · pass {fmtPct(e.passingPercentage)}</span>
                </div>
                <div className="mt-auto pt-5 flex items-center gap-2">
                  <Button variant="secondary" size="sm" icon={Eye} onClick={() => navigate(`/teacher/exams/${e._id}`)}>View</Button>
                  <Button variant="secondary" size="sm" icon={Pencil} onClick={() => navigate(`/teacher/exams/${e._id}/edit`)}>Edit</Button>
                  <Button variant="ghost" size="sm" icon={e.status === 'published' ? EyeOff : Eye} onClick={() => toggle(e)} title={e.status === 'published' ? 'Unpublish' : 'Publish'}>{e.status === 'published' ? 'Unpublish' : 'Publish'}</Button>
                  <Button variant="ghost" size="sm" className="ml-auto text-bad hover:text-bad" onClick={() => setToDelete(e)} aria-label="Delete exam"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </motion.div>
            ))}
          </div>
          <Pagination meta={meta} onPage={setPage} />
        </>
      )}

      <ConfirmModal open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove} loading={busy} danger confirmText="Delete exam"
        title="Delete this exam?" message={toDelete && `“${toDelete.title}” and all ${toDelete.attemptCount} student attempt(s) will be permanently deleted. This cannot be undone.`} />
    </>
  );
}
