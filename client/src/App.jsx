import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import { FullPageSpinner } from './components/ui/misc';
import Landing from './pages/Landing';
import AuthPage from './pages/auth/AuthPage';

const TeacherDashboard = lazy(() => import('./pages/teacher/Dashboard'));
const TeacherExams = lazy(() => import('./pages/teacher/Exams'));
const ExamEditor = lazy(() => import('./pages/teacher/ExamEditor'));
const ExamDetail = lazy(() => import('./pages/teacher/ExamDetail'));
const TeacherAttempt = lazy(() => import('./pages/teacher/AttemptDetail'));
const DifficultQuestionsPage = lazy(() => import('./pages/teacher/DifficultQuestionsPage'));
const Students = lazy(() => import('./pages/teacher/Students'));

const CandidateDashboard = lazy(() => import('./pages/candidate/Dashboard'));
const CandidateExams = lazy(() => import('./pages/candidate/Exams'));
const CandidateResults = lazy(() => import('./pages/candidate/Results'));
const ResultPage = lazy(() => import('./pages/candidate/ResultPage'));
const TakeExam = lazy(() => import('./pages/candidate/TakeExam'));

export default function App() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<AuthPage portal="candidate" mode="login" />} />
        <Route path="/register" element={<AuthPage portal="candidate" mode="register" />} />
        <Route path="/teacher/login" element={<AuthPage portal="teacher" mode="login" />} />

        <Route path="/teacher" element={<ProtectedRoute role="teacher"><DashboardLayout role="teacher" /></ProtectedRoute>}>
          <Route index element={<TeacherDashboard />} />
          <Route path="exams" element={<TeacherExams />} />
          <Route path="exams/new" element={<ExamEditor />} />
          <Route path="exams/:id" element={<ExamDetail />} />
          <Route path="exams/:id/edit" element={<ExamEditor />} />
          <Route path="attempts/:id" element={<TeacherAttempt />} />
          <Route path="questions" element={<DifficultQuestionsPage />} />
          <Route path="students" element={<Students />} />
        </Route>

        <Route path="/candidate" element={<ProtectedRoute role="candidate"><DashboardLayout role="candidate" /></ProtectedRoute>}>
          <Route index element={<CandidateDashboard />} />
          <Route path="exams" element={<CandidateExams />} />
          <Route path="results" element={<CandidateResults />} />
          <Route path="results/:id" element={<ResultPage />} />
        </Route>

        <Route path="/exam/:attemptId" element={<ProtectedRoute role="candidate"><TakeExam /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
