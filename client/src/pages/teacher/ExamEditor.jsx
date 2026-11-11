import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowLeft, ArrowUp, ChevronDown, Lock, Plus, Save, Trash2, X } from 'lucide-react';
import { teacherApi } from '../../services/endpoints';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Field';
import { ConfirmModal } from '../../components/ui/Modal';
import { Badge, ErrorState, PageHeader, Section } from '../../components/ui/misc';
import { Skeleton } from '../../components/ui/Skeleton';
import { cx, fmtNum, LETTERS } from '../../utils/format';

let counter = 0;
const cid = () => `q${Date.now()}-${++counter}`;
const newQuestion = () => ({ cid: cid(), questionText: '', options: ['', ''], correctOption: 0, explanation: '', marks: 1, open: true });

const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);

const BLANK = {
  title: '', description: '', subject: '', duration: 30, passingPercentage: 40, status: 'draft',
  startAt: '', endAt: '', allowMultipleAttempts: false, maxAttempts: 2, releaseMode: 'immediate',
};

function QuestionCard({ q, index, total, locked, error, onChange, onMove, onDelete, onToggle }) {
  const setOpt = (i, v) => onChange({ options: q.options.map((o, oi) => (oi === i ? v : o)) });
  const addOpt = () => q.options.length < 4 && onChange({ options: [...q.options, ''] });
  const removeOpt = (i) => {
    if (q.options.length <= 2) return;
    const options = q.options.filter((_, oi) => oi !== i);
    let correct = q.correctOption;
    if (i === correct) correct = 0;
    else if (i < correct) correct -= 1;
    onChange({ options, correctOption: correct });
  };

  return (
    <motion.div layout transition={{ type: 'spring', stiffness: 420, damping: 38 }} id={q.cid}
      className={cx('rounded-2xl border bg-surface/60', error ? 'border-bad/60' : 'border-line')}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button type="button" onClick={onToggle} className="flex items-center gap-3 flex-1 min-w-0 text-left" aria-expanded={q.open}>
          <span className="h-7 w-7 shrink-0 rounded-lg bg-brand/15 text-brand-soft text-xs font-bold grid place-items-center">{index + 1}</span>
          <span className={cx('truncate text-sm', q.questionText ? 'text-fg' : 'text-dim italic')}>{q.questionText || 'Untitled question'}</span>
          <ChevronDown className={cx('h-4 w-4 text-dim shrink-0 transition-transform', q.open && 'rotate-180')} />
        </button>
        <Badge>{fmtNum(Number(q.marks) || 0)} mark{Number(q.marks) === 1 ? '' : 's'}</Badge>
        {!locked && (
          <div className="flex items-center">
            <button type="button" disabled={index === 0} onClick={() => onMove(-1)} className="p-1.5 text-dim hover:text-fg disabled:opacity-30" aria-label="Move up"><ArrowUp className="h-4 w-4" /></button>
            <button type="button" disabled={index === total - 1} onClick={() => onMove(1)} className="p-1.5 text-dim hover:text-fg disabled:opacity-30" aria-label="Move down"><ArrowDown className="h-4 w-4" /></button>
            <button type="button" onClick={onDelete} className="p-1.5 text-dim hover:text-bad" aria-label="Delete question"><Trash2 className="h-4 w-4" /></button>
          </div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {q.open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-4 border-t border-line pt-4">
              <Textarea label="Question text" rows={2} value={q.questionText} onChange={(e) => onChange({ questionText: e.target.value })} placeholder="Type the question…" maxLength={1000} />

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label !mb-0">Options <span className="text-dim font-normal">— select the radio button for the correct answer</span></label>
                  <span className="text-[11px] text-dim">{q.options.length}/4</span>
                </div>
                <div className="space-y-2" role="radiogroup" aria-label="Correct option">
                  {q.options.map((opt, i) => (
                    <div key={i} className={cx('flex items-center gap-2.5 rounded-xl border px-3 py-1.5 transition-colors', q.correctOption === i ? 'border-ok/50 bg-ok/5' : 'border-line bg-card')}>
                      <input type="radio" name={`correct-${q.cid}`} checked={q.correctOption === i} disabled={locked} onChange={() => onChange({ correctOption: i })} className="h-4 w-4 accent-green-500 shrink-0" aria-label={`Option ${LETTERS[i]} is correct`} />
                      <span className="text-xs font-bold text-mute w-4">{LETTERS[i]}</span>
                      <input value={opt} onChange={(e) => setOpt(i, e.target.value)} placeholder={`Option ${LETTERS[i]}`} maxLength={300} className="flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-dim min-w-0" />
                      {q.correctOption === i && <span className="text-[10px] font-semibold text-ok uppercase tracking-wide hidden sm:block">Correct</span>}
                      {!locked && q.options.length > 2 && <button type="button" onClick={() => removeOpt(i)} className="text-dim hover:text-bad p-1" aria-label={`Remove option ${LETTERS[i]}`}><X className="h-4 w-4" /></button>}
                    </div>
                  ))}
                </div>
                {!locked && q.options.length < 4 && <Button type="button" variant="ghost" size="sm" icon={Plus} className="mt-2" onClick={addOpt}>Add option</Button>}
              </div>

              <div className="grid sm:grid-cols-[140px_1fr] gap-4">
                <Input label="Marks" type="number" min="0.25" step="0.25" value={q.marks} disabled={locked} onChange={(e) => onChange({ marks: e.target.value })} />
                <Textarea label="Explanation (optional, shown after results are released)" rows={2} value={q.explanation} onChange={(e) => onChange({ explanation: e.target.value })} placeholder="Why is this the correct answer?" maxLength={2000} />
              </div>
              {error && <p className="text-xs text-bad" role="alert">{error}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ExamEditor() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(BLANK);
  const [questions, setQuestions] = useState(() => (editing ? [] : [newQuestion()]));
  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState(null);
  const [locked, setLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [qErrors, setQErrors] = useState({});
  const [delIndex, setDelIndex] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!editing) return;
    teacherApi.exam(id).then(({ data }) => {
      const e = data.exam;
      setForm({
        title: e.title, description: e.description || '', subject: e.subject, duration: e.duration, passingPercentage: e.passingPercentage, status: e.status,
        startAt: toLocalInput(e.availability?.startAt), endAt: toLocalInput(e.availability?.endAt),
        allowMultipleAttempts: e.allowMultipleAttempts, maxAttempts: e.maxAttempts, releaseMode: e.resultReleaseSettings?.mode || 'immediate',
      });
      setQuestions(e.questions.map((q) => ({ cid: q._id, _id: q._id, questionText: q.questionText, options: [...q.options], correctOption: q.correctOption, explanation: q.explanation || '', marks: q.marks, open: false })));
      setLocked(data.hasAttempts);
    }).catch((e) => setLoadError(e.message)).finally(() => setLoading(false));
  }, [id, editing]);

  const set = (k) => (e) => { const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value; setForm((f) => ({ ...f, [k]: v })); setErrors((x) => ({ ...x, [k]: undefined })); };
  const totalMarks = useMemo(() => questions.reduce((s, q) => s + (Number(q.marks) || 0), 0), [questions]);

  const patchQ = (i, patch) => { setQuestions((qs) => qs.map((q, qi) => (qi === i ? { ...q, ...patch } : q))); setQErrors((e) => ({ ...e, [questions[i].cid]: undefined })); };
  const moveQ = (i, dir) => setQuestions((qs) => { const n = [...qs]; const j = i + dir; if (j < 0 || j >= n.length) return qs; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const addQ = () => {
    setQuestions((qs) => [...qs.map((q) => ({ ...q, open: false })), newQuestion()]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  };

  const validate = () => {
    const e = {};
    if (form.title.trim().length < 3) e.title = 'Title must be at least 3 characters';
    if (form.subject.trim().length < 2) e.subject = 'Subject is required';
    const dur = Number(form.duration);
    if (!Number.isInteger(dur) || dur < 1 || dur > 600) e.duration = 'Enter 1–600 minutes';
    const pass = Number(form.passingPercentage);
    if (Number.isNaN(pass) || form.passingPercentage === '' || pass < 0 || pass > 100) e.passingPercentage = 'Enter 0–100';
    if (form.startAt && form.endAt && new Date(form.endAt) <= new Date(form.startAt)) e.endAt = 'End must be after the start';
    if (form.allowMultipleAttempts && (Number(form.maxAttempts) < 2 || Number(form.maxAttempts) > 10)) e.maxAttempts = 'Enter 2–10';
    if (form.status === 'published' && questions.length === 0) e.questions = 'Add at least one question before publishing';

    const qe = {};
    questions.forEach((q) => {
      const opts = q.options.map((o) => o.trim());
      if (q.questionText.trim().length < 3) qe[q.cid] = 'Question text is required (min 3 characters)';
      else if (opts.some((o) => !o)) qe[q.cid] = 'Fill in or remove empty options';
      else if (new Set(opts.map((o) => o.toLowerCase())).size !== opts.length) qe[q.cid] = 'Options must be unique';
      else if (!(Number(q.marks) >= 0.25 && Number(q.marks) <= 100)) qe[q.cid] = 'Marks must be between 0.25 and 100';
    });
    setErrors(e); setQErrors(qe);
    const firstBad = questions.find((q) => qe[q.cid]);
    if (firstBad) {
      setQuestions((qs) => qs.map((q) => (q.cid === firstBad.cid ? { ...q, open: true } : q)));
      setTimeout(() => document.getElementById(firstBad.cid)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
    }
    return !Object.keys(e).length && !firstBad;
  };

  const save = async (statusOverride) => {
    const status = statusOverride || form.status;
    if (statusOverride) setForm((f) => ({ ...f, status }));
    if (!validate()) { toast.error('Please fix the highlighted fields'); return; }
    const body = {
      title: form.title.trim(), description: form.description.trim(), subject: form.subject.trim(),
      duration: Number(form.duration), passingPercentage: Number(form.passingPercentage), status,
      availability: { startAt: fromLocalInput(form.startAt), endAt: fromLocalInput(form.endAt) },
      allowMultipleAttempts: form.allowMultipleAttempts, maxAttempts: form.allowMultipleAttempts ? Number(form.maxAttempts) : 1,
      resultReleaseSettings: { mode: form.releaseMode },
      questions: questions.map((q) => ({
        ...(q._id && { _id: q._id }), questionText: q.questionText.trim(), options: q.options.map((o) => o.trim()),
        correctOption: q.correctOption, explanation: q.explanation.trim(), marks: Number(q.marks),
      })),
    };
    setSaving(true);
    try {
      const res = editing ? await teacherApi.updateExam(id, body) : await teacherApi.createExam(body);
      toast.success(editing ? 'Exam updated' : 'Exam created');
      navigate(`/teacher/exams/${res.data.exam._id}`);
    } catch (err) {
      toast.error(err.message);
    } finally { setSaving(false); }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-72" /><Skeleton className="h-48" /></div>;
  if (loadError) return <ErrorState message={loadError} />;

  return (
    <>
      <Link to={editing ? `/teacher/exams/${id}` : '/teacher/exams'} className="text-xs text-mute hover:text-fg inline-flex items-center gap-1 mb-3"><ArrowLeft className="h-3.5 w-3.5" />Back</Link>
      <PageHeader title={editing ? 'Edit exam' : 'Create exam'} subtitle="Strictly multiple-choice: 2–4 options and exactly one correct answer per question."
        actions={<><Button variant="secondary" loading={saving} onClick={() => save('draft')}>Save as draft</Button><Button icon={Save} loading={saving} onClick={() => save('published')}>{editing && form.status === 'published' ? 'Save & keep published' : 'Save & publish'}</Button></>} />

      {locked && (
        <div className="mb-5 flex gap-3 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
          <Lock className="h-4 w-4 shrink-0 mt-0.5" />
          <p>Students have already attempted this exam. Question order, correct answers, marks, number of options and the passing percentage are locked. You can still fix wording and explanations, and change other settings.</p>
        </div>
      )}

      <div className="space-y-6">
        <Section title="Exam details">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><Input label="Exam title" value={form.title} onChange={set('title')} error={errors.title} placeholder="e.g. Mid-term Physics Test" maxLength={150} /></div>
            <div className="md:col-span-2"><Textarea label="Description" value={form.description} onChange={set('description')} placeholder="Instructions or an overview for candidates" maxLength={2000} /></div>
            <Input label="Subject" value={form.subject} onChange={set('subject')} error={errors.subject} placeholder="Physics" />
            <Select label="Status" value={form.status} onChange={set('status')}><option value="draft">Draft (hidden from students)</option><option value="published">Published (visible to students)</option></Select>
            <Input label="Duration (minutes)" type="number" min="1" max="600" value={form.duration} onChange={set('duration')} error={errors.duration} />
            <Input label="Passing percentage" type="number" min="0" max="100" value={form.passingPercentage} onChange={set('passingPercentage')} error={errors.passingPercentage} disabled={locked} />
            <div>
              <label className="label">Total marks</label>
              <div className="field flex items-center justify-between !bg-card cursor-default"><span className="tabular-nums font-semibold">{fmtNum(totalMarks)}</span><span className="text-[11px] text-dim">auto-calculated from questions</span></div>
            </div>
            <div />
            <Input label="Start date & time (optional)" type="datetime-local" value={form.startAt} onChange={set('startAt')} />
            <Input label="End date & time (optional)" type="datetime-local" value={form.endAt} onChange={set('endAt')} error={errors.endAt} />
          </div>
        </Section>

        <Section title="Attempts & results">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-line bg-surface/50 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={form.allowMultipleAttempts} onChange={set('allowMultipleAttempts')} className="mt-1 h-4 w-4 accent-violet-500" />
                <span><span className="text-sm font-medium block">Allow multiple attempts</span><span className="text-xs text-dim">By default each student can attempt the exam once.</span></span>
              </label>
              {form.allowMultipleAttempts && <div className="mt-3 max-w-[200px]"><Input label="Maximum attempts" type="number" min="2" max="10" value={form.maxAttempts} onChange={set('maxAttempts')} error={errors.maxAttempts} /></div>}
            </div>
            <Select label="Result & explanation release" value={form.releaseMode} onChange={set('releaseMode')}
              hint={form.releaseMode === 'immediate' ? 'Students see score, correct answers and explanations right after submitting.' : 'Students see nothing until you release results from the exam page.'}>
              <option value="immediate">Release immediately after submission</option><option value="manual">Release manually</option>
            </Select>
          </div>
        </Section>

        <Section title="Questions" subtitle="Add, edit, delete and reorder questions"
          actions={<div className="flex items-center gap-2"><Badge tone="brand">{questions.length} question{questions.length === 1 ? '' : 's'}</Badge><Badge>{fmtNum(totalMarks)} marks</Badge></div>}>
          {errors.questions && <p className="text-sm text-bad mb-3" role="alert">{errors.questions}</p>}
          <div className="space-y-3">
            {questions.map((q, i) => (
              <QuestionCard key={q.cid} q={q} index={i} total={questions.length} locked={locked} error={qErrors[q.cid]}
                onChange={(p) => patchQ(i, p)} onMove={(d) => moveQ(i, d)} onDelete={() => setDelIndex(i)} onToggle={() => patchQ(i, { open: !q.open })} />
            ))}
          </div>
          {!locked && <Button type="button" variant="secondary" icon={Plus} className="mt-4 w-full sm:w-auto" onClick={addQ}>Add question</Button>}
          <div ref={bottomRef} />
        </Section>

        <div className="flex justify-end gap-2 pb-6">
          <Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
          <Button icon={Save} loading={saving} onClick={() => save()}>{editing ? 'Save changes' : 'Create exam'}</Button>
        </div>
      </div>

      <ConfirmModal open={delIndex !== null} onClose={() => setDelIndex(null)} danger title="Delete question?" confirmText="Delete"
        message={delIndex !== null && `Question ${delIndex + 1} will be removed from this exam.`}
        onConfirm={() => { setQuestions((qs) => qs.filter((_, i) => i !== delIndex)); setDelIndex(null); }} />
    </>
  );
}
