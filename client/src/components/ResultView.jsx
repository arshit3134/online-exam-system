import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, MinusCircle, Clock, Target, Award, Lightbulb, Hourglass } from 'lucide-react';
import { ResultDonut } from './charts';
import { Badge, Section } from './ui/misc';
import { cx, fmtDateTime, fmtDuration, fmtNum, fmtPct, LETTERS } from '../utils/format';

const Tile = ({ icon: Icon, label, value, tone }) => (
  <div className="rounded-xl border border-line bg-surface/60 p-4">
    <div className="flex items-center gap-2 text-xs text-mute"><Icon className={cx('h-4 w-4', tone)} />{label}</div>
    <p className="text-xl font-bold mt-1.5 tabular-nums">{value}</p>
  </div>
);

export function Summary({ attempt, exam }) {
  const passed = attempt.passed;
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-6 lg:col-span-1 relative overflow-hidden">
        <div className={cx('absolute -top-16 -right-16 h-44 w-44 rounded-full blur-3xl opacity-25', passed ? 'bg-ok' : 'bg-bad')} />
        <div className="relative">
          <Badge tone={passed ? 'ok' : 'bad'} dot>{passed ? 'Passed' : 'Failed'}</Badge>
          <p className="text-5xl font-extrabold mt-4 tracking-tight tabular-nums">{fmtPct(attempt.percentage)}</p>
          <p className="text-mute mt-1 text-sm">{fmtNum(attempt.score)} of {fmtNum(attempt.totalMarks)} marks</p>
          <p className="text-xs text-dim mt-3">Pass mark: {fmtPct(exam.passingPercentage)}</p>
          <ResultDonut correct={attempt.correctCount} incorrect={attempt.incorrectCount} unanswered={attempt.unansweredCount} />
        </div>
      </motion.div>
      <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3 content-start">
        <Tile icon={Target} label="Total marks" value={fmtNum(attempt.totalMarks)} tone="text-brand-soft" />
        <Tile icon={Award} label="Marks obtained" value={fmtNum(attempt.score)} tone="text-brand-soft" />
        <Tile icon={Target} label="Percentage" value={fmtPct(attempt.percentage)} tone="text-brand-soft" />
        <Tile icon={CheckCircle2} label="Correct" value={attempt.correctCount} tone="text-ok" />
        <Tile icon={XCircle} label="Incorrect" value={attempt.incorrectCount} tone="text-bad" />
        <Tile icon={MinusCircle} label="Unanswered" value={attempt.unansweredCount} tone="text-dim" />
        <Tile icon={Clock} label="Time taken" value={fmtDuration(attempt.timeTaken)} tone="text-brand-soft" />
        <Tile icon={Hourglass} label="Submitted" value={<span className="text-sm font-semibold">{fmtDateTime(attempt.submittedAt)}</span>} tone="text-brand-soft" />
        <Tile icon={Award} label="Result" value={passed ? 'Pass' : 'Fail'} tone={passed ? 'text-ok' : 'text-bad'} />
        {attempt.autoSubmitted && <p className="col-span-full text-xs text-warn">This attempt was submitted automatically when the time limit was reached.</p>}
      </div>
    </div>
  );
}

export function AnswerReview({ review }) {
  return (
    <div className="space-y-4">
      {review.map((q, i) => {
        const status = q.selectedOption === null || q.selectedOption === undefined ? 'unanswered' : q.isCorrect ? 'correct' : 'incorrect';
        const frame = { correct: 'border-ok/30', incorrect: 'border-bad/30', unanswered: 'border-line' }[status];
        return (
          <motion.div key={q.questionId} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.3 }}
            className={cx('card p-5', frame)}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span className="h-7 w-7 shrink-0 rounded-lg bg-zinc-800 text-xs font-bold grid place-items-center">{i + 1}</span>
                <p className="font-medium leading-relaxed break-words">{q.questionText}</p>
              </div>
              <div className="shrink-0 text-right">
                {status === 'correct' && <Badge tone="ok" dot>Correct</Badge>}
                {status === 'incorrect' && <Badge tone="bad" dot>Incorrect</Badge>}
                {status === 'unanswered' && <Badge dot>Unanswered</Badge>}
                <p className="text-[11px] text-dim mt-1.5 tabular-nums">{fmtNum(q.marksAwarded)} / {fmtNum(q.marks)}</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2">
              {q.options.map((opt, oi) => {
                const isCorrect = oi === q.correctOption;
                const isSelected = oi === q.selectedOption;
                const wrongPick = isSelected && !isCorrect;
                return (
                  <li key={oi} className={cx('flex items-start gap-3 rounded-xl border px-3.5 py-2.5 text-sm',
                    isCorrect ? 'border-ok/40 bg-ok/10' : wrongPick ? 'border-bad/40 bg-bad/10' : 'border-line bg-surface/40 text-mute')}>
                    <span className={cx('h-5 w-5 shrink-0 rounded-md text-[11px] font-bold grid place-items-center mt-px', isCorrect ? 'bg-ok text-black' : wrongPick ? 'bg-bad text-white' : 'bg-zinc-800 text-mute')}>{LETTERS[oi]}</span>
                    <span className={cx('flex-1 break-words', (isCorrect || wrongPick) && 'text-fg')}>{opt}</span>
                    {isSelected && <span className="text-[11px] font-medium text-mute whitespace-nowrap">Your answer</span>}
                    {isCorrect && <span className="text-[11px] font-medium text-ok whitespace-nowrap flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Correct</span>}
                  </li>
                );
              })}
            </ul>
            {q.explanation && (
              <div className="mt-4 flex gap-3 rounded-xl border border-brand/25 bg-brand/5 px-4 py-3">
                <Lightbulb className="h-4 w-4 text-brand-soft shrink-0 mt-0.5" />
                <div><p className="text-xs font-semibold text-brand-soft mb-0.5">Explanation</p><p className="text-sm text-mute whitespace-pre-wrap">{q.explanation}</p></div>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

export default function ResultView({ data, teacherView = false }) {
  return (
    <div className="space-y-6">
      <Summary attempt={data.attempt} exam={data.exam} />
      <Section title="Answer review" subtitle={teacherView ? "The student's answers alongside the answer key" : 'Review every question with the correct answer and explanation'}>
        <AnswerReview review={data.review} />
      </Section>
    </div>
  );
}
