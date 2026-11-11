import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Award, CheckCircle2, ClipboardCheck, Mail, PlayCircle, Target, TrendingUp, XCircle, ArrowRight, Hourglass } from 'lucide-react';
import { candidateApi } from '../../services/endpoints';
import useFetch from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import { EmptyState, ErrorState, PassBadge, Section, StatCard } from '../../components/ui/misc';
import { CardSkeleton, Skeleton } from '../../components/ui/Skeleton';
import ExamCard from '../../components/ExamCard';
import { fmtDate, fmtNum, fmtPct } from '../../utils/format';

export default function CandidateDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useFetch(() => candidateApi.dashboard(), []);
  const s = data?.stats;

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-6 sm:p-8 relative overflow-hidden mb-6">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand/20 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="h-16 w-16 rounded-2xl bg-brand-gradient grid place-items-center text-2xl font-bold shadow-glow">{user.name[0].toUpperCase()}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-mute">Welcome back,</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{user.name}</h1>
            <p className="text-sm text-dim mt-1 flex items-center gap-1.5 truncate"><Mail className="h-3.5 w-3.5" />{user.email} · Candidate</p>
          </div>
          {data?.inProgress && (
            <Button icon={PlayCircle} onClick={() => navigate(`/exam/${data.inProgress.attemptId}`)}>Resume “{data.inProgress.examTitle}”</Button>
          )}
        </div>
      </motion.div>

      {error ? <ErrorState message={error} onRetry={refetch} /> : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {loading ? Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />) : (
            <>
              <StatCard index={0} icon={ClipboardCheck} label="Exams attempted" value={s.totalAttempted} sub={s.pendingRelease ? `${s.pendingRelease} awaiting results` : 'All results in'} />
              <StatCard index={1} icon={Target} label="Average score" value={fmtPct(s.averagePercentage)} tone="blue" />
              <StatCard index={2} icon={TrendingUp} label="Highest score" value={fmtPct(s.highestPercentage)} tone="ok" />
              <StatCard index={3} icon={CheckCircle2} label="Passed" value={s.passed} tone="ok" />
              <StatCard index={4} icon={XCircle} label="Failed" value={s.failed} tone="bad" />
            </>
          )}
        </div>
      )}

      <Section className="mt-6" title="Available exams" subtitle="Published exams you can take right now"
        actions={<Link to="/candidate/exams" className="link text-xs inline-flex items-center gap-1">View all<ArrowRight className="h-3.5 w-3.5" /></Link>}>
        {loading ? <Skeleton className="h-44" /> : !data.availableExams.length ? (
          <EmptyState icon={Award} title="No exams available" description="When a teacher publishes an exam it will show up here." />
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{data.availableExams.map((e, i) => <ExamCard key={e._id} exam={e} index={i} />)}</div>
        )}
      </Section>

      <Section className="mt-6" title="Recent results"
        actions={<Link to="/candidate/results" className="link text-xs inline-flex items-center gap-1">All results<ArrowRight className="h-3.5 w-3.5" /></Link>}>
        {loading ? <Skeleton className="h-32" /> : !data.recentResults.length ? (
          <EmptyState icon={Hourglass} title="No results yet" description="Complete an exam and your results will appear here." />
        ) : (
          <ul className="divide-y divide-line -mx-5">
            {data.recentResults.map((r) => (
              <li key={r._id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                <div className="min-w-0 flex-1"><p className="font-medium truncate">{r.exam.title}</p><p className="text-xs text-dim">{fmtDate(r.submittedAt)}</p></div>
                {r.resultReleased && <span className="text-sm tabular-nums text-mute">{fmtNum(r.score)}/{fmtNum(r.totalMarks)} · {fmtPct(r.percentage)}</span>}
                <PassBadge passed={r.passed} released={r.resultReleased} />
                <Link to={`/candidate/results/${r._id}`} className="link text-xs">View</Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
