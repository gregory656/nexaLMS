import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SchoolProvider } from './contexts/SchoolContext';
import { HelpProvider } from './contexts/HelpContext';

// Layouts
import DashboardLayout from './components/layout/DashboardLayout';

// Pages
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import InviteAcceptPage from './pages/auth/InviteAcceptPage';
import SetupPage from './pages/setup/SetupPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import StudentsPage from './pages/students/StudentsPage';
import StudentLeadersPage from './pages/students/StudentLeadersPage';
import StaffPage from './pages/staff/StaffPage';
import DutyRosterPage from './pages/staff/DutyRosterPage';
import GuardiansPage from './pages/guardians/GuardiansPage';
import StreamsPage from './pages/academics/StreamsPage';
import SubjectsPage from './pages/academics/SubjectsPage';
import HousesPage from './pages/academics/HousesPage';
import AcademicYearsPage from './pages/academics/AcademicYearsPage';
import DepartmentsPage from './pages/academics/DepartmentsPage';
import TimetablePage from './pages/academics/TimetablePage';
import AlumniPage from './pages/alumni/AlumniPage';
import RolesPage from './pages/roles/RolesPage';
import SubscriptionPage from './pages/subscription/SubscriptionPage';
import ExamsPage from './pages/exams/ExamsPage';
import ReportCardsPage from './pages/reports/ReportCardsPage';
import AttendancePage from './pages/attendance/AttendancePage';
import FinancePage from './pages/finance/FinancePage';
import DocumentationPage from './pages/documents/DocumentationPage';
import SitePage from './pages/site/SitePage';
import ContactPage from './pages/site/ContactPage';

// Simple placeholder pages for sections being built
function Placeholder({ title }: { title: string }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>This module is coming soon in the next development phase.</p>
    </div>
  );
}

// Protected Route Shield
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isSetupComplete, isInviteFlow } = useAuth();

  // Intercept Supabase auth redirect URLs (like invite or recovery links)
  // If the user lands on a protected route with a hash token, send them to the create account page
  if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('type=invite') || window.location.hash.includes('type=recovery'))) {
    return <Navigate to={`/auth/create-account${window.location.hash}`} replace />;
  }

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <p className="text-sm font-semibold mt-2">NexaLMS is loading...</p>
    </div>
  );

  if (!user) return <Navigate to="/auth/login" />;

  // If user exists but school isn't setup, send to setup (unless they are on setup or in invite flow)
  if (!isSetupComplete && window.location.pathname !== '/setup' && !isInviteFlow) {
    return <Navigate to="/setup" />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <SchoolProvider>
        <HelpProvider>
          <BrowserRouter>
            <Toaster position="top-right" />
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/signup" element={<SignupPage />} />
              <Route path="/auth/create-account" element={<InviteAcceptPage />} />
              <Route path="/site" element={<SitePage />} />
              <Route path="/site/contact" element={<ContactPage />} />
              <Route path="/site/:page" element={<SitePage />} />

              {/* Setup Wizard */}
              <Route path="/setup" element={
                <ProtectedRoute>
                  <SetupPage />
                </ProtectedRoute>
              } />

              {/* Dashboard Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />

                {/* People */}
                <Route path="students" element={<StudentsPage />} />
                <Route path="student-leaders" element={<StudentLeadersPage />} />
                <Route path="staff" element={<StaffPage />} />
                <Route path="duty-roster" element={<DutyRosterPage />} />
                <Route path="guardians" element={<GuardiansPage />} />
                <Route path="alumni" element={<AlumniPage />} />

                {/* Academics */}
                <Route path="academics/streams" element={<StreamsPage />} />
                <Route path="academics/subjects" element={<SubjectsPage />} />
                <Route path="academics/houses" element={<HousesPage />} />
                <Route path="academics/years" element={<AcademicYearsPage />} />
                <Route path="academics/departments" element={<DepartmentsPage />} />
                <Route path="academics/timetable" element={<TimetablePage />} />

                {/* Assessment — each is a full page with internal tabs */}
                <Route path="exams" element={<ExamsPage />} />
                <Route path="reports" element={<ReportCardsPage />} />
                <Route path="attendance" element={<AttendancePage />} />

                {/* Finance */}
                <Route path="finance" element={<FinancePage />} />

                {/* Administration */}
                <Route path="roles" element={<RolesPage />} />
                <Route path="subscription" element={<SubscriptionPage />} />
                <Route path="documentation" element={<DocumentationPage />} />
                <Route path="announcements" element={<Placeholder title="Announcements" />} />
                <Route path="settings" element={<SetupPage />} />

                {/* Fallback for dashboard routes */}
                <Route path="*" element={<Navigate to="/dashboard" />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </HelpProvider>
      </SchoolProvider>
    </AuthProvider>
  );
}
