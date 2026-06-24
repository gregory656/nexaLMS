import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SchoolProvider } from './contexts/SchoolContext';

// Layouts
import DashboardLayout from './components/layout/DashboardLayout';

// Pages
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import SetupPage from './pages/setup/SetupPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import StudentsPage from './pages/students/StudentsPage';
import StaffPage from './pages/staff/StaffPage';
import GuardiansPage from './pages/guardians/GuardiansPage';
import StreamsPage from './pages/academics/StreamsPage';
import SubjectsPage from './pages/academics/SubjectsPage';
import RolesPage from './pages/roles/RolesPage';
import SubscriptionPage from './pages/subscription/SubscriptionPage';

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
  const { user, loading, isSetupComplete } = useAuth();

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <p className="text-sm font-semibold mt-2">NexaLMS is loading...</p>
    </div>
  );

  if (!user) return <Navigate to="/auth/login" />;

  // If user exists but school isn't setup, send to setup (unless they are on setup)
  if (!isSetupComplete && window.location.pathname !== '/setup') {
    return <Navigate to="/setup" />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <SchoolProvider>
        <BrowserRouter>
          <Toaster position="top-right" />
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/signup" element={<SignupPage />} />

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
              <Route path="staff" element={<StaffPage />} />
              <Route path="guardians" element={<GuardiansPage />} />

              {/* Academics */}
              <Route path="academics/streams" element={<StreamsPage />} />
              <Route path="academics/subjects" element={<SubjectsPage />} />
              <Route path="academics/houses" element={<Placeholder title="Houses Management" />} />
              <Route path="academics/years" element={<Placeholder title="Academic Years" />} />
              <Route path="academics/departments" element={<Placeholder title="Departments" />} />
              <Route path="academics/timetable" element={<Placeholder title="Timetable" />} />

              {/* Assessment */}
              <Route path="exams" element={<Placeholder title="Examinations" />} />
              <Route path="reports" element={<Placeholder title="Report Cards" />} />
              <Route path="attendance" element={<Placeholder title="Attendance" />} />

              {/* Administration */}
              <Route path="roles" element={<RolesPage />} />
              <Route path="subscription" element={<SubscriptionPage />} />
              <Route path="announcements" element={<Placeholder title="Announcements" />} />
              <Route path="settings" element={<Placeholder title="Global Settings" />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </BrowserRouter>
      </SchoolProvider>
    </AuthProvider>
  );
}
