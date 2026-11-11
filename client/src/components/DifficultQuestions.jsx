import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronDown, Flame, Users } from 'lucide-react';
import { teacherApi } from '../services/endpoints';
import useFetch from '../hooks/useFetch';
import { Badge, EmptyState, ErrorState, ProgressBar } from './ui/misc';
import { Skeleton } from './ui/Skeleton';
import { Select } from './ui/Field';
import { cx, fmtPct, LETTERS } from '../utils/format';

function QuestionRow({ q, rank }) {
  const [open, setOpen] = useState(false);
  const tone = q.incorrectPercentage >= 60 ? 'bad' : q.incorrectPercentage >= 35 ? 'warn' : 'brand';
  return (
    <motion.div layout className="rounded-xl border border-line bg-surface/50 overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left p-4 flex gap-4 items-start hover:bg-white/[0.02] transition" aria-expanded={open}>
        <span className="h-8 w-8 shrink-0 rounded-lg bg-zinc-800 grid place-items-center text-xs font-bold text-mute">#{rank}</span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm leading-relaxed break-words">{q.questionText}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-dim">
            <Link to={`/teacher/exams/${q.examId}`} onClick={(e) => e.stopPropagation()} className="link">{q.examTitle}</Link>
            <span>Q{q.questionNumber}</span>
            <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{q.totalAttempts} attempts</span>
          </div>
          <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
            <ProgressBar value={q.incorrectPercentage} tone={tone === 'brand' ? 'brand' : 'bad'} />
            <span className={cx('text-sm font-bold tabular-nums', tone === 'bad' ? 'text-bad' : tone === 'warn' ? 'text-warn' : 'text-brand-soft')}>{fmtPct(q.incorrectPercentage)}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone="bad">{q.incorrectCount} incorrect</Badge>
            <Badge tone="ok">{q.correctCount} correct</Badge>
            {q.unansweredCount > 0 && <Badge>{q.unansweredCount} skipped</Badge>}
          </div>
        </div>
        <ChevronDown className={cx('h-4 w-4 text-dim shrink-0 mt-1 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="px-4 pb-4 pl-16 space-y-3">
          <div className="flex items-start gap-2 rounded-lg border border-ok/30 bg-ok/10 px-3 py-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-ok shrink-0 mt-0.5" />
            <p><span className="text-xs font-semibold text-ok mr-1.5">Correct answer</span><span className="text-fg">{LETTERS[q.correctOption]}. {q.correctAnswer}</span></p>
          </div>
          {q.mostChosenWrongOption && (
            <p className="text-xs text-mute">Most common wrong answer: <span className="text-fg">{LETTERS[q.mostChosenWrongOption.option]}. {q.mostChosenWrongOption.text}</span> ({q.mostChosenWrongOption.count} students)</p>
          )}
          {q.explanation && <p className="text-xs text-dim whitespace-pre-wrap">Explanation: {q.explanation}</p>}
        </div>
      )}
    </motion.div>
  );
}

/** "Most Difficult Questions" — ranked by incorrect-answer rate from real attempt data. */
export default function DifficultQuestions({ limit = 5, examId, withFilters = false, exams = [] }) {
  const [sortBy, setSortBy] = useState('percentage');
  const [exam, setExam] = useState('');
  const { data, loading, error, refetch } = useFetch(
    () => teacherApi.difficult({ limit, sortBy, ...((examId || exam) && { examId: examId || exam }) }),
    [limit, sortBy, examId, exam]
  );

  return (
    <div>
      {withFilters && (
        <div className="grid sm:grid-cols-2 gap-3 mb-4 max-w-xl">
          <Select label="Exam" value={exam} onChange={(e) => setExam(e.target.value)}>
            <option value="">All exams</option>
            {exams.map((e) => <option key={e._id} value={e._id}>{e.title}</option>)}
          </Select>
          <Select label="Sort by" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="percentage">Incorrect-answer percentage</option>
            <option value="count">Incorrect response count</option>
          </Select>
        </div>
      )}
      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !data.length ? (
        <EmptyState icon={Flame} title="No difficult questions yet" description="Once students submit attempts, the questions they answer incorrectly most often will appear here." />
      ) : (
        <div className="space-y-3">{data.map((q, i) => <QuestionRow key={`${q.examId}-${q.questionId}`} q={q} rank={i + 1} />)}</div>
      )}
    </div>
  );
}
