import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, GraduationCap, ShieldCheck, Timer, UserRound } from 'lucide-react';
import { useAuth, homeFor } from '../context/AuthContext';
import { Logo, FullPageSpinner } from '../components/ui/misc';

const features = [
  { icon: ShieldCheck, title: 'Server-side grading', text: 'Answer keys never leave the server until results are released.' },
  { icon: Timer, title: 'Enforced timing', text: 'Countdown, autosave and auto-submit backed by server deadlines.' },
  { icon: BarChart3, title: 'Real analytics', text: 'See which questions students struggle with most.' },
];

export default function Landing() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (user) return <Navigate to={homeFor(user.role)} replace />;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="max-w-6xl w-full mx-auto px-5 h-16 flex items-center justify-between"><Logo /></header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-5 py-10 sm:py-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium text-brand-soft">Online examination platform</span>
          <h1 className="mt-5 text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]">Create, run and analyse exams <span className="gradient-text">with confidence.</span></h1>
          <p className="mt-5 text-lg text-mute max-w-2xl">A secure MCQ examination system for teachers and candidates — timed attempts, instant evaluation, detailed explanations and analytics that show where students struggle.</p>
        </motion.div>

        <div className="mt-10 grid sm:grid-cols-2 gap-4 max-w-3xl">
          {[
            { to: '/login', icon: UserRound, title: "I'm a student", text: 'Take exams and review your results.', cta: 'Student sign in' },
            { to: '/teacher/login', icon: GraduationCap, title: "I'm a teacher", text: 'Build exams and analyse performance.', cta: 'Teacher sign in' },
          ].map((c, i) => (
            <motion.div key={c.to} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.08 }}>
              <Link to={c.to} className="group card card-hover block p-6 hover:shadow-glow">
                <div className="h-11 w-11 rounded-xl bg-brand/10 text-brand-soft grid place-items-center mb-4"><c.icon className="h-5 w-5" /></div>
                <h2 className="font-semibold text-lg">{c.title}</h2>
                <p className="text-sm text-mute mt-1">{c.text}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand-soft group-hover:gap-2.5 transition-all">{c.cta}<ArrowRight className="h-4 w-4" /></span>
              </Link>
            </motion.div>
          ))}
        </div>
        <p className="mt-4 text-sm text-dim">New student? <Link to="/register" className="link">Create an account</Link></p>

        <div className="mt-16 grid sm:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-line bg-surface/60 p-5">
              <f.icon className="h-5 w-5 text-brand-soft" />
              <h3 className="font-semibold mt-3">{f.title}</h3>
              <p className="text-sm text-mute mt-1">{f.text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
