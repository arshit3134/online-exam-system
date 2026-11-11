import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ChevronLeft, ChevronRight, Cloud, CloudOff, Clock, Flag, Send } from 'lucide-react';
import { candidateApi } from '../../services/endpoints';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ErrorState, FullPageSpinner, Logo } from '../../components/ui/misc';
import { cx, fmtClock, LETTERS } from '../../utils/format';

const AUTOSAVE_MS = 10000;

const visitedKey = (id) => `exam-visited-${id}`;
const loadVisited = (id) => {
  try { return new Set(JSON.parse(sessionStorage.getItem(visitedKey(id)) || '[]')); } catch { return new Set(); }
};
const storeVisited = (id, set) => {
  try { sessionStorage.setItem(visitedKey(id), JSON.stringify([...set])); } catch { /* storage unavailable */ }
};

export default function TakeExam() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [loadError, setLoadError] = useState(null);
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({}); // questionId -> option index | null
  const [visited, setVisited] = useState(new Set());
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState(null);
  const [saveState, setSaveState] = useState('saved'); // saved | saving | error
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeUp, setTimeUp] = useState(false);

  const endAt = useRef(0); // client-side deadline derived from the server's remaining seconds
  const dirty = useRef(new Set());
  const answersRef = useRef({});
  const submittedRef = useRef(false);
  const submittingRef = useRef(false);
  answersRef.current = answers;

  const goToResult = useCallback(() => {
    submittedRef.current = true;
    try { sessionStorage.removeItem(visitedKey(attemptId)); } catch { /* ignore */ }
    navigate(`/candidate/results/${attemptId}`, { replace: true });
  }, [attemptId, navigate]);

  // ---- load / restore attempt (works after a refresh) ----
  useEffect(() => {
    let alive = true;
    candidateApi.attempt(attemptId)
      .then((res) => {
        if (!alive) return;
        const d = res.data;
        if (d.finished) { goToResult(); return; }
        const map = {};
        d.attempt.answers.forEach((a) => { map[a.questionId] = a.selectedOption; });
        setExam(d.exam);
        setAnswers(map);
        setVisited(loadVisited(attemptId).add(d.exam.questions[0]?._id));
        endAt.current = Date.now() + d.attempt.remainingSeconds * 1000;
        setRemaining(d.attempt.remainingSeconds);
      })
      .catch((e) => alive && setLoadError(e.message));
    return () => { alive = false; };
  }, [attemptId, goToResult]);

  // ---- save dirty answers to the backend ----
  const flush = useCallback(async () => {
    if (submittedRef.current || submittingRef.current || !dirty.current.size) return true;
    const ids = [...dirty.current];
    const payload = ids.map((questionId) => ({ questionId, selectedOption: answersRef.current[questionId] ?? null }));
    setSaveState('saving');
    try {
      await candidateApi.saveAnswers(attemptId, payload);
      ids.forEach((id) => {
        // keep dirty if the user changed it again while the request was in flight
        const sent = payload.find((p) => p.questionId === id).selectedOption;
        if ((answersRef.current[id] ?? null) === sent) dirty.current.delete(id);
      });
      setSaveState('saved');
      return true;
    } catch (e) {
      if (e.code === 'ALREADY_SUBMITTED' || e.code === 'TIME_UP') { goToResult(); return true; }
      setSaveState('error');
      return false;
    }
  }, [attemptId, goToResult]);

  useEffect(() => {
    if (!exam) return undefined;
    const t = setInterval(flush, AUTOSAVE_MS);
    return () => clearInterval(t);
  }, [exam, flush]);

  // ---- submission (manual or automatic). Guarded so it can only run once. ----
  const submit = useCallback(async (auto = false) => {
    if (submittingRef.current || submittedRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setConfirmOpen(false);
    const payload = Object.entries(answersRef.current).map(([questionId, selectedOption]) => ({ questionId, selectedOption: selectedOption ?? null }));
    let lastErr;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        await candidateApi.submit(attemptId, payload);
        if (auto) toast.info('Time is up — your exam was submitted automatically.');
        else toast.success('Exam submitted successfully');
        goToResult();
        return;
      } catch (e) {
        lastErr = e;
        if (e.status && e.status < 500 && e.status !== 408) break; // not a transient failure
        await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
      }
    }
    submittingRef.current = false;
    setSubmitting(false);
    toast.error(lastErr?.message || 'Could not submit. Please try again.');
  }, [attemptId, goToResult, toast]);

  // ---- countdown (derived from a fixed deadline so it can't drift or be paused) ----
  useEffect(() => {
    if (remaining === null) return undefined;
    const tick = () => {
      const left = Math.max(Math.ceil((endAt.current - Date.now()) / 1000), 0);
      setRemaining(left);
      if (left <= 0) { setTimeUp(true); submit(true); }
    };
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [remaining === null, submit]); // eslint-disable-line react-hooks/exhaustive-deps

  // warn before leaving mid-exam
  useEffect(() => {
    const handler = (e) => { if (!submittedRef.current) { flush(); e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [flush]);

  const questions = exam?.questions || [];
  const q = questions[current];

  const select = (qid, idx) => {
    setAnswers((a) => ({ ...a, [qid]: idx }));
    dirty.current.add(qid);
    setSaveState('saving');
  };
  const clear = (qid) => select(qid, null);

  const go = (i) => {
    if (i < 0 || i >= questions.length) return;
    setCurrent(i);
    setVisited((v) => {
      const next = new Set(v).add(questions[i]._id);
      storeVisited(attemptId, next);
      return next;
    });
    flush();
  };

  const stats = useMemo(() => {
    const answered = questions.filter((x) => answers[x._id] !== null && answers[x._id] !== undefined).length;
    return { answered, unanswered: questions.length - answered };
  }, [questions, answers]);

  // keyboard: arrows to navigate, 1-4 / a-d to answer
  useEffect(() => {
    if (!q || confirmOpen) return undefined;
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowRight') go(current + 1);
      else if (e.key === 'ArrowLeft') go(current - 1);
      else {
        const idx = '1234'.indexOf(e.key) >= 0 ? '1234'.indexOf(e.key) : 'abcd'.indexOf(e.key.toLowerCase());
        if (idx >= 0 && idx < q.options.length) select(q._id, idx);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  if (loadError) return <div className="min-h-screen grid place-items-center p-6"><ErrorState message={loadError} onRetry={() => navigate('/candidate')} /></div>;
  if (!exam || remaining === null) return <FullPageSpinner />;

  const low = remaining <= 60;
  const statusOf = (i) => {
    const id = questions[i]._id;
    if (i === current) return 'current';
    if (answers[id] !== null && answers[id] !== undefined) return 'answered';
    if (visited.has(id)) return 'visited';
    return 'new';
  };
  const chip = {
    current: 'bg-brand-gradient text-white shadow-glow',
    answered: 'bg-ok/15 border-ok/40 text-ok',
    visited: 'bg-warn/10 border-warn/40 text-warn',
    new: 'bg-surface border-line text-mute hover:border-zinc-500',
  };

  const NavPanel = (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Questions</h3>
        <span className="text-xs text-dim tabular-nums">{stats.answered}/{questions.length} answered</span>
      </div>
      <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-5 gap-2">
        {questions.map((x, i) => {
          const s = statusOf(i);
          return (
            <button key={x._id} onClick={() => go(i)} aria-label={`Question ${i + 1}, ${s === 'new' ? 'not visited' : s}`} aria-current={s === 'current'}
              className={cx('h-9 rounded-lg border border-transparent text-xs font-semibold tabular-nums transition', chip[s])}>{i + 1}</button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-4 text-[11px] text-mute">
        <Legend cls="bg-brand-gradient" label="Current" />
        <Legend cls="bg-ok/40 border border-ok/60" label="Answered" />
        <Legend cls="bg-warn/30 border border-warn/60" label="Visited, unanswered" />
        <Legend cls="bg-surface border border-line" label="Not visited" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-base/90 backdrop-blur">
        <div className="max-w-6xl mx-auto h-16 px-4 flex items-center gap-4">
          <Logo className="hidden md:flex" />
          <div className="min-w-0 flex-1">
            <h1 className="text-sm sm:text-base font-semibold truncate">{exam.title}</h1>
            <p className="text-[11px] text-dim flex items-center gap-1.5">
              {saveState === 'error' ? <><CloudOff className="h-3 w-3 text-bad" /><span className="text-bad">Not saved — retrying</span></> :
                saveState === 'saving' ? <><Cloud className="h-3 w-3" />Saving…</> : <><Cloud className="h-3 w-3 text-ok" />All answers saved</>}
            </p>
          </div>
          <div className={cx('flex items-center gap-2 rounded-xl border px-3 py-2 tabular-nums font-mono text-base font-semibold', low ? 'border-bad/50 bg-bad/10 text-bad animate-pulse' : 'border-line bg-card text-fg')} role="timer" aria-label="Time remaining">
            <Clock className="h-4 w-4" />{fmtClock(remaining)}
          </div>
          <Button size="md" icon={Send} onClick={() => { flush(); setConfirmOpen(true); }} disabled={submitting} className="hidden sm:inline-flex">Submit</Button>
        </div>
        <div className="h-0.5 bg-line"><div className={cx('h-full transition-all', low ? 'bg-bad' : 'bg-brand')} style={{ width: `${(stats.answered / questions.length) * 100}%` }} /></div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 grid lg:grid-cols-[1fr_300px] gap-6 items-start">
        <section>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={q._id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.16 }} className="card p-5 sm:p-7">
              <div className="flex items-center justify-between text-xs text-mute mb-4">
                <span className="font-semibold text-brand-soft">Question {current + 1} <span className="text-dim font-normal">of {questions.length}</span></span>
                <span className="rounded-full bg-zinc-800 px-2.5 py-0.5">{q.marks} {q.marks === 1 ? 'mark' : 'marks'}</span>
              </div>
              <p className="text-lg sm:text-xl font-medium leading-relaxed whitespace-pre-wrap break-words">{q.questionText}</p>

              <div role="radiogroup" aria-label="Answer options" className="mt-6 space-y-3">
                {q.options.map((opt, i) => {
                  const on = answers[q._id] === i;
                  return (
                    <button key={i} role="radio" aria-checked={on} onClick={() => select(q._id, i)}
                      className={cx('w-full flex items-start gap-4 rounded-xl border px-4 py-3.5 text-left transition',
                        on ? 'border-brand bg-brand/10 shadow-glow' : 'border-line bg-surface hover:border-zinc-500 hover:bg-white/[0.03]')}>
                      <span className={cx('h-7 w-7 shrink-0 rounded-lg grid place-items-center text-xs font-bold', on ? 'bg-brand-gradient text-white' : 'bg-zinc-800 text-mute')}>{LETTERS[i]}</span>
                      <span className="flex-1 pt-0.5 break-words">{opt}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <Button variant="secondary" icon={ChevronLeft} onClick={() => go(current - 1)} disabled={current === 0}>Previous</Button>
                <button onClick={() => clear(q._id)} disabled={answers[q._id] === null || answers[q._id] === undefined} className="text-xs text-dim hover:text-fg disabled:opacity-0 transition">Clear answer</button>
                {current < questions.length - 1
                  ? <Button onClick={() => go(current + 1)}>Next<ChevronRight className="h-4 w-4" /></Button>
                  : <Button icon={Flag} onClick={() => { flush(); setConfirmOpen(true); }} disabled={submitting}>Finish</Button>}
              </div>
            </motion.div>
          </AnimatePresence>
          <p className="hidden md:block text-[11px] text-dim mt-3 text-center">Tip: use ← → to move between questions and 1–4 (or A–D) to choose an option.</p>
        </section>

        <aside className="lg:sticky lg:top-24 space-y-4">
          {NavPanel}
          <Button className="w-full sm:hidden" icon={Send} onClick={() => { flush(); setConfirmOpen(true); }} disabled={submitting}>Submit exam</Button>
        </aside>
      </main>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Submit your exam?" locked={submitting}
        footer={<>
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Keep working</Button>
          <Button icon={Send} onClick={() => submit(false)} loading={submitting}>Submit now</Button>
        </>}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-ok/30 bg-ok/10 p-3 text-center"><p className="text-2xl font-bold text-ok tabular-nums">{stats.answered}</p><p className="text-xs text-mute">Answered</p></div>
            <div className={cx('rounded-xl border p-3 text-center', stats.unanswered ? 'border-warn/30 bg-warn/10' : 'border-line bg-surface')}><p className={cx('text-2xl font-bold tabular-nums', stats.unanswered && 'text-warn')}>{stats.unanswered}</p><p className="text-xs text-mute">Unanswered</p></div>
          </div>
          {stats.unanswered > 0 && <p className="flex gap-2 text-warn text-xs"><AlertTriangle className="h-4 w-4 shrink-0" />You still have unanswered questions. Unanswered questions score zero.</p>}
          <p>Once submitted you cannot change your answers.</p>
        </div>
      </Modal>

      <Modal open={timeUp} title="Time is up" locked onClose={() => {}}>
        <div className="flex items-center gap-3"><div className="h-5 w-5 rounded-full border-2 border-line border-t-brand animate-spin" />Submitting your answers…</div>
      </Modal>
    </div>
  );
}

const Legend = ({ cls, label }) => <span className="flex items-center gap-1.5"><span className={cx('h-3 w-3 rounded', cls)} />{label}</span>;
