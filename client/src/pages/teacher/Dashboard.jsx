import { Link } from 'react-router-dom';
import { Award, BarChart3, BookOpen, CheckCircle2, ClipboardCheck, Plus, TrendingDown, TrendingUp, Users, Target, ArrowRight } from 'lucide-react';
import { teacherApi } from '../../services/endpoints';
import useFetch from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import { Badge, EmptyState, ErrorState, PageHeader, Section, StatCard } from '../../components/ui/misc';
import { CardSkeleton, Skeleton } from '../../components/ui/Skeleton';
import { AvgMarksChart, ExamWiseChart, PassFailChart, ScoreDistributionChart, StudentPerformanceChart } from '../../components/charts';
import DifficultQuestions from '../../components/DifficultQuestions';
import { fmtDateTime, fmtNum, fmtPct } from '../../utils/format';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const overview = useFetch(() => teacherApi.dashboard(), []);
  const charts = useFetch(() => teacherApi.analytics(), []);

  const s = overview.data?.stats;
  return (
    <>
      <PageHeader
        title={`Welcome back, ${user.name.split(' ')[0]}`}
        subtitle="Live performance across all of your exams."
        actions={<Link to="/teacher/exams/new"><Button icon={Plus}>New exam</Button></Link>}
      />

      {overview.error ? <ErrorState message={overview.error} onRetry={overview.refetch} /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {overview.loading ? Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />) : (
            <>
              <StatCard index={0} icon={Users} label="Total students" value={s.totalStudents} sub="Registered candidates" />
              <StatCard index={1} icon={BookOpen} label="Exams created" value={s.totalExams} sub={`${s.publishedExams} published`} tone="blue" />
              <StatCard index={2} icon={ClipboardCheck} label="Total attempts" value={s.totalAttempts} sub="Submitted exams" tone="blue" />
              <StatCard index={3} icon={BarChart3} label="Average marks" value={fmtNum(s.averageScore)} sub={`${fmtPct(s.averagePercentage)} average`} />
              <StatCard index={4} icon={TrendingUp} label="Highest score" value={fmtNum(s.highestScore)} sub={`${fmtPct(s.highestPercentage)} best attempt`} tone="ok" />
              <StatCard index={5} icon={TrendingDown} label="Lowest score" value={fmtNum(s.lowestScore)} sub={`${fmtPct(s.lowestPercentage)} lowest attempt`} tone="bad" />
              <StatCard index={6} icon={Target} label="Average pass rate" value={fmtPct(s.passPercentage)} sub="Attempts that passed" tone="ok" />
              <StatCard index={7} icon={Award} label="Published exams" value={s.publishedExams} sub="Visible to students" tone="warn" />
            </>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        {charts.error ? <div className="lg:col-span-2"><ErrorState message={charts.error} onRetry={charts.refetch} /></div> : charts.loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="card p-5"><Skeleton className="h-4 w-40 mb-4" /><Skeleton className="h-[260px]" /></div>)
        ) : (
          <>
            <Section title="Average marks across exams" subtitle="Mean percentage score per exam"><AvgMarksChart data={charts.data.examWise} /></Section>
            <Section title="Pass vs fail" subtitle="Share of attempts meeting the pass mark"><PassFailChart data={charts.data.passFail} /></Section>
            <Section title="Score distribution" subtitle="Attempts grouped by percentage score"><ScoreDistributionChart data={charts.data.scoreDistribution} /></Section>
            <Section title="Student performance" subtitle="Students grouped by their average score"><StudentPerformanceChart data={charts.data.studentPerformance} /></Section>
            <Section title="Exam-wise performance" subtitle="Attempts and pass rate for each exam" className="lg:col-span-2"><ExamWiseChart data={charts.data.examWise} /></Section>
          </>
        )}
      </div>

      <Section className="mt-6" title="Most Difficult Questions" subtitle="Ranked by the share of students who answered incorrectly"
        actions={<Link to="/teacher/questions" className="link text-xs inline-flex items-center gap-1">View all<ArrowRight className="h-3.5 w-3.5" /></Link>}>
        <DifficultQuestions limit={5} />
      </Section>

      <Section className="mt-6" title="Recent submissions">
        {overview.loading ? <Skeleton className="h-40" /> : !overview.data?.recentAttempts.length ? (
          <EmptyState icon={CheckCircle2} title="No submissions yet" description="Student submissions will appear here as soon as they finish an exam." />
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full min-w-[560px]">
              <thead><tr><th className="th">Student</th><th className="th">Exam</th><th className="th">Score</th><th className="th">Result</th><th className="th">Submitted</th><th className="th" /></tr></thead>
              <tbody className="divide-y divide-line">
                {overview.data.recentAttempts.map((a) => (
                  <tr key={a._id} className="hover:bg-white/[0.02]">
                    <td className="td"><p className="font-medium">{a.candidate?.name}</p><p className="text-xs text-dim">{a.candidate?.email}</p></td>
                    <td className="td text-mute">{a.exam?.title}</td>
                    <td className="td tabular-nums">{fmtNum(a.score)}/{fmtNum(a.totalMarks)} <span className="text-dim">({fmtPct(a.percentage)})</span></td>
                    <td className="td">{a.passed ? <Badge tone="ok" dot>Passed</Badge> : <Badge tone="bad" dot>Failed</Badge>}</td>
                    <td className="td text-dim whitespace-nowrap">{fmtDateTime(a.submittedAt)}</td>
                    <td className="td text-right"><Link to={`/teacher/attempts/${a._id}`} className="link text-xs">View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}
