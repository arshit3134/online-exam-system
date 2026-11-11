import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutDashboard, FileText, Users, HelpCircle, GraduationCap, ClipboardList, Trophy, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Logo } from '../components/ui/misc';
import { cx } from '../utils/format';

const NAV = {
  teacher: [
    { to: '/teacher', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/teacher/exams', label: 'Exams', icon: FileText },
    { to: '/teacher/questions', label: 'Difficult Questions', icon: HelpCircle },
    { to: '/teacher/students', label: 'Students', icon: Users },
  ],
  candidate: [
    { to: '/candidate', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/candidate/exams', label: 'Available Exams', icon: ClipboardList },
    { to: '/candidate/results', label: 'My Results', icon: Trophy },
  ],
};

function SidebarContent({ role, user, onNavigate, onLogout }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 h-16 flex items-center border-b border-line"><Logo /></div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-dim">{role === 'teacher' ? 'Teacher workspace' : 'Student workspace'}</p>
        {NAV[role].map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={onNavigate}
            className={({ isActive }) => cx('relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors', isActive ? 'text-white' : 'text-mute hover:text-fg hover:bg-white/5')}>
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId={`nav-active-${role}`} className="absolute inset-0 rounded-xl bg-brand/15 border border-brand/30" transition={{ type: 'spring', stiffness: 400, damping: 35 }} />}
                <Icon className={cx('relative h-[18px] w-[18px]', isActive && 'text-brand-soft')} />
                <span className="relative">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-line">
        <div className="flex items-center gap-3 rounded-xl p-2">
          <div className="h-9 w-9 shrink-0 rounded-full bg-brand-gradient grid place-items-center text-sm font-bold">{user.name?.[0]?.toUpperCase()}</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-[11px] text-dim truncate flex items-center gap-1">{role === 'teacher' && <GraduationCap className="h-3 w-3" />}{user.email}</p>
          </div>
          <button onClick={onLogout} className="p-2 rounded-lg text-dim hover:text-bad hover:bg-bad/10 transition" aria-label="Sign out" title="Sign out"><LogOut className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ role }) {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [location.pathname]);

  const onLogout = async () => {
    await logout();
    toast.info('You have been signed out');
    navigate(role === 'teacher' ? '/teacher/login' : '/login', { replace: true });
  };

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-surface/80 backdrop-blur border-r border-line z-30">
        <SidebarContent role={role} user={user} onLogout={onLogout} />
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 h-14 flex items-center justify-between px-4 bg-base/85 backdrop-blur border-b border-line">
        <Logo />
        <button onClick={() => setOpen(true)} className="p-2 -mr-2 text-mute hover:text-fg" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="lg:hidden fixed inset-0 z-40 bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside className="lg:hidden fixed inset-y-0 left-0 w-72 z-50 bg-surface border-r border-line"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}>
              <button onClick={() => setOpen(false)} className="absolute right-3 top-4 p-1.5 text-dim hover:text-fg" aria-label="Close menu"><X className="h-5 w-5" /></button>
              <SidebarContent role={role} user={user} onNavigate={() => setOpen(false)} onLogout={onLogout} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1280px] mx-auto">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
