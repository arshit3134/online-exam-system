import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarClock, Clock, HelpCircle, PlayCircle, RotateCcw, Target } from 'lucide-react';
import { candidateApi } from '../services/endpoints';
import { useToast } from '../context/ToastContext';
import Button from './ui/Button';
import { Badge } from './ui/misc';
import { Modal } from './ui/Modal';
import { fmtDateTime, fmtNum, fmtPct } from '../utils/format';

const STATUS = {
  open: { tone: 'ok', label: 'Open' },
  in_progress: { tone: 'brand', label: 'In progress' },
  upcoming: { tone: 'warn', label: 'Upcoming' },
  ended: { tone: 'bad', label: 'Closed' },
  completed: { tone: 'neutral', label: 'Completed' },
};

export default function ExamCard({ exam, index = 0 }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const st = STATUS[exam.status] || STATUS.open;

  const start = async () => {
    setBusy(true);
    try {
      const res = await candidateApi.start(exam._id);
      navigate(`/exam/${res.data.attempt._id}`);
    } catch (e) {
      toast.error(e.message);
      setBusy(false);
    }
  };

  let label = 'Start exam';
  let Icon = PlayCircle;
  if (exam.status === 'in_progress') { label = 'Resume exam'; Icon = RotateCcw; }
  else if (exam.status === 'upcoming') label = 'Not started';
  else if (exam.status === 'ended') label = 'Closed';
  else if (exam.status === 'completed') label = 'Completed';

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="card card-hover p-5 flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <Badge tone="brand">{exam.subject}</Badge>
        <Badge tone={st.tone} dot>{st.label}</Badge>
      </div>
      <h3 className="mt-3 font-semibold text-lg leading-snug line-clamp-2">{exam.title}</h3>
      {exam.description && <p className="text-sm text-mute mt-1 line-clamp-2">{exam.description}</p>}
      <div className="grid grid-cols-2 gap-y-2 gap-x-3 mt-4 text-xs text-mute">
        <span className="flex items-center gap-1.5"><HelpCircle className="h-3.5 w-3.5 text-dim" />{exam.questionCount} questions</span>
        <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-dim" />{exam.duration} minutes</span>
        <span className="flex items-center gap-1.5 tabular-nums"><Target className="h-3.5 w-3.5 text-dim" />{fmtNum(exam.totalMarks)} marks</span>
        <span className="tabular-nums">Pass: {fmtPct(exam.passingPercentage)}</span>
      </div>
      {(exam.availability?.startAt || exam.availability?.endAt) && (
        <p className="mt-3 text-[11px] text-dim flex items-start gap-1.5"><CalendarClock className="h-3.5 w-3.5 mt-px shrink-0" />
          {exam.availability.startAt && <>Opens {fmtDateTime(exam.availability.startAt)}</>}{exam.availability.startAt && exam.availability.endAt && ' · '}
          {exam.availability.endAt && <>Closes {fmtDateTime(exam.availability.endAt)}</>}
        </p>
      )}
      {exam.maxAttempts > 1 && <p className="mt-2 text-[11px] text-dim">Attempts used: {exam.attemptsUsed}/{exam.maxAttempts}</p>}
      <div className="mt-auto pt-5">
        <Button className="w-full" icon={Icon} disabled={!exam.canStart}
          onClick={() => (exam.status === 'in_progress' ? start() : setOpen(true))} loading={busy && !open}>{label}</Button>
      </div>

      <StartDialog open={open} onClose={() => !busy && setOpen(false)} onStart={start} busy={busy} exam={exam} />
    </motion.div>
  );
}

function StartDialog({ open, onClose, onStart, busy, exam }) {
  return (
    <Modal open={open} onClose={onClose} title={`Start “${exam.title}”?`} locked={busy}
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button icon={PlayCircle} onClick={onStart} loading={busy}>Begin exam</Button></>}>
      <ul className="space-y-2 list-disc pl-5">
        <li>You have <b className="text-fg">{exam.duration} minutes</b>. The timer starts immediately and keeps running even if you close the page.</li>
        <li>{exam.questionCount} multiple-choice questions, {fmtNum(exam.totalMarks)} marks in total.</li>
        <li>Your answers are saved automatically. If you refresh, you can resume where you left off.</li>
        <li>The exam is submitted automatically when the time runs out.</li>
      </ul>
    </Modal>
  );
}
