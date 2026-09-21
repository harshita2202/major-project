import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Auth & Landing Pages
import Home from './pages/auth/Home';
import StudentLogin from './pages/auth/StudentLogin';
import InvigilatorLogin from './pages/auth/InvigilatorLogin';

// Student Pages
import StudentPortal from './pages/student/StudentPortal';
import StudentExam from './pages/StudentExam';

// Invigilator Pages & Layout
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import LiveMonitoring from './pages/LiveMonitoring';
import Exams from './pages/Exams';
import Students from './pages/Students';
import Violations from './pages/Violations';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

// Route Protection
import ProtectedRoute from './components/auth/ProtectedRoute';
import { ROLES } from './services/auth';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public Landing & Login Routes ── */}
        <Route path="/" element={<Home />} />
        <Route path="/student-login" element={<StudentLogin />} />
        <Route path="/invigilator-login" element={<InvigilatorLogin />} />

        {/* ── Student Protected Experience ── */}
        <Route element={<ProtectedRoute allowedRole={ROLES.STUDENT} />}>
          <Route path="/student" element={<StudentPortal />} />
          <Route path="/student/exams" element={<StudentPortal />} />
          <Route path="/student/exam/:examId" element={<StudentExam />} />
        </Route>

        {/* ── Invigilator Protected Experience ── */}
        <Route element={<ProtectedRoute allowedRole={ROLES.INVIGILATOR} />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/live-monitoring" element={<LiveMonitoring />} />
            <Route path="/exams" element={<Exams />} />
            <Route path="/students" element={<Students />} />
            <Route path="/violations" element={<Violations />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>

        {/* ── Catch-all Fallback (Redirect to Home Landing) ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}