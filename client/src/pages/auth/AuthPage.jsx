import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, Lock, Mail, User, UserRound, ArrowLeft } from 'lucide-react';
import { useAuth, homeFor } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Input } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import { Logo, FullPageSpinner } from '../../components/ui/misc';

export default function AuthPage({ portal, mode }) {
  const { user, loading, login, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const isTeacher = portal === 'teacher';
  const isRegister = mode === 'register';

  if (loading) return <FullPageSpinner />;
  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })); };

  const validate = () => {
    const e = {};
    if (isRegister && form.name.trim().length < 2) e.name = 'Enter your full name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (isRegister) {
      if (form.password.length < 8) e.password = 'Use at least 8 characters';
      else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) e.password = 'Include at least one letter and one number';
    } else if (!form.password) e.password = 'Enter your password';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const u = isRegister
        ? await register({ name: form.name.trim(), email: form.email.trim(), password: form.password })
        : await login({ email: form.email.trim(), password: form.password, portal });
      toast.success(isRegister ? `Welcome, ${u.name.split(' ')[0]}!` : `Welcome back, ${u.name.split(' ')[0]}`);
      navigate(location.state?.from && location.state.from.startsWith(homeFor(u.role)) ? location.state.from : homeFor(u.role), { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const Icon = isTeacher ? GraduationCap : UserRound;
  return (
    <div className="min-h-screen grid place-items-center px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <Logo />
          <Link to="/" className="text-xs text-mute hover:text-fg inline-flex items-center gap-1"><ArrowLeft className="h-3.5 w-3.5" />Home</Link>
        </div>
        <div className="card p-7 sm:p-8">
          <div className="h-11 w-11 rounded-xl bg-brand/10 text-brand-soft grid place-items-center mb-5"><Icon className="h-5 w-5" /></div>
          <h1 className="text-2xl font-bold tracking-tight">{isTeacher ? 'Teacher sign in' : isRegister ? 'Create your student account' : 'Student sign in'}</h1>
          <p className="text-sm text-mute mt-1.5">{isTeacher ? 'Access your exams, results and analytics.' : isRegister ? 'Register to take exams and track your results.' : 'Sign in to take exams and view your results.'}</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            {isRegister && <Input label="Full name" icon={User} value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" placeholder="Jane Doe" />}
            <Input label="Email" icon={Mail} type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" placeholder="you@example.com" />
            <Input label="Password" icon={Lock} type="password" value={form.password} onChange={set('password')} error={errors.password} autoComplete={isRegister ? 'new-password' : 'current-password'} placeholder="••••••••" hint={isRegister ? 'At least 8 characters, with a letter and a number.' : undefined} />
            <Button type="submit" size="lg" loading={submitting} className="w-full">{isRegister ? 'Create account' : 'Sign in'}</Button>
          </form>

          <div className="mt-6 pt-5 border-t border-line text-sm text-mute space-y-2">
            {isTeacher ? (
              <p>Teacher accounts are created by an administrator. <Link to="/login" className="link">Student? Sign in here</Link></p>
            ) : isRegister ? (
              <p>Already registered? <Link to="/login" className="link">Sign in</Link></p>
            ) : (
              <>
                <p>New here? <Link to="/register" className="link">Create a student account</Link></p>
                <p>Are you a teacher? <Link to="/teacher/login" className="link">Teacher sign in</Link></p>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
