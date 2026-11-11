import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarClock, CheckCircle2, Clock, Eye, EyeOff, HelpCircle, Megaphone, Pencil, Repeat, Target, Trash2, Users, ArrowLeft, Lock } from 'lucide-react';
import { teacherApi } from '../../services/endpoints';
import useFetch from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import { ConfirmModal } from '../../components/ui/Modal';
import { Badge, EmptyState, ErrorState, PassBadge, Pagination, Section, StatCard } from '../../components/ui/misc';
import { Skeleton, TableSkeleton } from '../../components/ui/Skeleton';
import DifficultQuestions from '../../components/DifficultQuestions';
import { cx, fmtDateTime, fmtDuration, fmtNum, fmtPct, LETTERS } from '../../utils/format';

function Attempts({ examId, resultMode, onChanged }) {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const { data, meta, loading, error, refetch, reload } = useFetch(() => teacherApi.attempts(examId, { page, limit: 10 }), [examId, page]);

  const toggle = async (a) => {
    try {
      await teacherApi.releaseAttempt(a._id, !a.resultReleased);
      toast.success(a.resultReleased ? 'Result hidden from student' : 'Result released to student');
      reload(); onChanged();
    } catch (e) { toast.error(e.message); }
  };

  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (loading) return <TableSkeleton />;
  if (!data.attempts.length) return <EmptyState icon={Users} title="No submissions yet" description="Students who complete this exam will appear here." />;
  return (
    <>
      {data.inProgress > 0 && <p className="text-xs text-warn mb-3">{data.inProgress} student{data.inProgress > 1 ? 's are' : ' is'} currently taking this exam.</p>}
      <div className="overflow-x-auto -mx-5">
        <table className="w-full min-w-[860px]">
          <thead><tr><th className="th">Student</th><th className="th">#</th><th className="th">Score</th><th className="th">Result</th><th className="th">Time</th><th className="th">Submitted</th><th className="th">Visibility</th><th className="th" /></tr></thead>
          <tbody className="divide-y divide-line">
            {data.attempts.map((a) => (
              <tr key={a._id} className="hover:bg-white/[0.02]">
                <td className="td"><p className="font-medium">{a.candidate?.name || 'Deleted user'}</p><p className="text-xs text-dim">{a.candidate?.email}</p></td>
                <td className="td text-mute">{a.attemptNumber}</td>
                <td className="td tabular-nums">{fmtNum(a.score)}/{fmtNum(a.totalMarks)} <span className="text-dim">({fmtPct(a.percentage)})</span></td>
                <td className="td"><PassBadge passed={a.passed} /></td>
                <td className="td text-mute whitespace-nowrap">{fmtDuration(a.timeTaken)}{a.autoSubmitted && <span className="text-warn text-[11px] ml-1.5">auto</span>}</td>
                <td className="td text-dim whitespace-nowrap">{fmtDateTime(a.submittedAt)}</td>
                <td className="td"><button onClick={() => toggle(a)} className={cx('inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 border transition', a.resultReleased ? 'border-ok/30 text-ok bg-ok/10 hover:bg-ok/20' : 'border-warn/30 text-warn bg-warn/10 hover:bg-warn/20')} title="Toggle release">{a.resultReleased ? <><Eye className="h-3 w-3" />Released</> : <><EyeOff className="h-3 w-3" />Hidden</>}</button></td>
                <td className="td text-right"><Link to={`/teacher/attempts/${a._id}`} className="link text-xs font-medium">View result</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination meta={meta} onPage={setPage} />
    </>
  );
}

export default function ExamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, refetch, reload } = useFetch(() => teacherApi.exam(id), [id]);
  const [tab, setTab] = useState('attempts');
  const [del, setDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [releaseAsk, setReleaseAsk] = useState(null);

  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (loading) return <div className="space-y-4"><Skeleton className="h-12 w-80" /><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div><Skeleton className="h-64" /></div>;

  const { exam, stats, hasAttempts } = data;
  const published = exam.status === 'published';

  const toggleStatus = async () => {
    try { await teacherApi.setStatus(id, published ? 'draft' : 'published'); toast.success(published ? 'Exam unpublished' : 'Exam published'); reload(); } catch (e) { toast.error(e.message); }
  };
  const release = async (released) => {
    setBusy(true);
    try { const r = await teacherApi.releaseExam(id, released); toast.success(released ? `Results released (${r.data.updated} updated)` : 'Results hidden'); setReleaseAsk(null); reload(); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try { await teacherApi.deleteExam(id); toast.success('Exam deleted'); navigate('/teacher/exams', { replace: true }); }
    catch (e) { toast.error(e.message); setBusy(false); }
  };

  return (
    <>
      <Link to="/teacher/exams" className="text-xs text-mute hover:text-fg inline-flex items-center gap-1 mb-3"><ArrowLeft className="h-3.5 w-3.5" />All exams</Link>
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge tone={published ? 'ok' : 'neutral'} dot>{published ? 'Published' : 'Draft'}</Badge>
            <Badge tone="brand">{exam.subject}</Badge>
            {hasAttempts && <Badge tone="warn"><Lock className="h-3 w-3 mr-1" />Structure locked</Badge>}
          </div>
          <h1 className="text-2xl font-bold tracking-tight break-words">{exam.title}</h1>
          {exam.description && <p className="text-sm text-mute mt-1.5 max-w-2xl whitespace-pre-wrap">{exam.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="secondary" icon={Pencil} onClick={() => navigate(`/teacher/exams/${id}/edit`)}>Edit</Button>
          <Button variant="secondary" icon={published ? EyeOff : Eye} onClick={toggleStatus}>{published ? 'Unpublish' : 'Publish'}</Button>
          <Button variant="danger" icon={Trash2} onClick={() => setDel(true)}>Delete</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard index={0} icon={Users} label="Submissions" value={stats.submitted} sub={`${fmtPct(stats.passRate)} passed`} />
        <StatCard index={1} icon={Target} label="Average score" value={fmtPct(stats.averagePercentage)} sub={`Pass mark ${fmtPct(exam.passingPercentage)}`} tone="blue" />
        <StatCard index={2} icon={CheckCircle2} label="Best / lowest" value={`${fmtNum(stats.highest)}% / ${fmtNum(stats.lowest)}%`} tone="ok" />
        <StatCard index={3} icon={Megaphone} label="Results released" value={`${stats.released}/${stats.submitted}`} sub={exam.resultReleaseSettings.mode === 'manual' ? 'Manual release' : 'Immediate release'} tone="warn" />
      </div>

      <div className="grid md:grid-cols-3 gap-3 mt-4">
        {[
          [HelpCircle, `${exam.questionCount} questions · ${fmtNum(exam.totalMarks)} marks`],
          [Clock, `${exam.duration} minutes`],
          [Repeat, exam.allowMultipleAttempts ? `Up to ${exam.maxAttempts} attempts` : 'Single attempt'],
        ].map(([Icon, text]) => <div key={text} className="rounded-xl border border-line bg-surface/50 px-4 py-3 text-sm flex items-center gap-2.5 text-mute"><Icon className="h-4 w-4 text-brand-soft" />{text}</div>)}
        <div className="md:col-span-3 rounded-xl border border-line bg-surface/50 px-4 py-3 text-sm flex items-center gap-2.5 text-mute"><CalendarClock className="h-4 w-4 text-brand-soft" />
          {exam.availability?.startAt || exam.availability?.endAt ? <>Available {exam.availability.startAt ? `from ${fmtDateTime(exam.availability.startAt)}` : 'immediately'} {exam.availability.endAt ? `until ${fmtDateTime(exam.availability.endAt)}` : 'with no end date'}</> : 'Always available while published'}</div>
      </div>

      <div className="flex gap-1 mt-8 mb-4 border-b border-line overflow-x-auto">
        {[['attempts', 'Attempts'], ['difficult', 'Difficult questions'], ['questions', 'Questions & answers']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={cx('px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors', tab === k ? 'border-brand text-fg' : 'border-transparent text-mute hover:text-fg')}>{label}</button>
        ))}
      </div>

      {tab === 'attempts' && (
        <Section title="Student attempts" actions={stats.submitted > 0 && (
          <div className="flex gap-2">
            {stats.unreleased > 0 && <Button size="sm" variant="success" icon={Megaphone} onClick={() => setReleaseAsk('release')}>Release all ({stats.unreleased})</Button>}
            {stats.released > 0 && <Button size="sm" variant="secondary" icon={EyeOff} onClick={() => setReleaseAsk('hide')}>Hide all</Button>}
          </div>)}>
          <Attempts examId={id} resultMode={exam.resultReleaseSettings.mode} onChanged={reload} />
        </Section>
      )}
      {tab === 'difficult' && <Section title="Most difficult questions in this exam"><DifficultQuestions limit={50} examId={id} /></Section>}
      {tab === 'questions' && (
        <Section title="Questions & answer key" subtitle="Only visible to you">
          {!exam.questions.length ? <EmptyState icon={HelpCircle} title="No questions yet" description="Edit the exam to add multiple-choice questions." /> : (
            <div className="space-y-4">
              {exam.questions.map((q, i) => (
                <div key={q._id} className="rounded-xl border border-line bg-surface/50 p-4">
                  <div className="flex justify-between gap-3"><p className="font-medium text-sm"><span className="text-dim mr-2">{i + 1}.</span>{q.questionText}</p><Badge>{fmtNum(q.marks)} mk</Badge></div>
                  <ul className="mt-3 space-y-1.5">{q.options.map((o, oi) => (
                    <li key={oi} className={cx('flex gap-2.5 rounded-lg px-3 py-2 text-sm border', oi === q.correctOption ? 'border-ok/40 bg-ok/10 text-fg' : 'border-line text-mute')}>
                      <span className="font-bold w-4">{LETTERS[oi]}</span><span className="flex-1">{o}</span>{oi === q.correctOption && <CheckCircle2 className="h-4 w-4 text-ok mt-0.5" />}
                    </li>))}
                  </ul>
                  {q.explanation && <p className="text-xs text-dim mt-3 whitespace-pre-wrap">Explanation: {q.explanation}</p>}
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      <ConfirmModal open={del} onClose={() => setDel(false)} onConfirm={remove} loading={busy} danger confirmText="Delete exam" title="Delete this exam?"
        message={`“${exam.title}” and all of its student attempts will be permanently deleted. This cannot be undone.`} />
      <ConfirmModal open={!!releaseAsk} onClose={() => setReleaseAsk(null)} loading={busy} onConfirm={() => release(releaseAsk === 'release')}
        confirmText={releaseAsk === 'release' ? 'Release results' : 'Hide results'} title={releaseAsk === 'release' ? 'Release all results?' : 'Hide all results?'}
        message={releaseAsk === 'release' ? 'Every student who submitted will be able to see their score, the correct answers and explanations.' : 'Students will no longer be able to see their scores or answer review.'} />
    </>
  );
}
