import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

import StudentGroupManagementPage from './pages/StudentGroupManagementPage'
import CoordinatorManagementPage from './pages/CoordinatorManagementPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PhaseSchedulingPage from './pages/PhaseSchedulingPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import StudentSubmissionPage from './pages/StudentSubmissionPage';
import { Layout } from './components/layout/Layout';
import AdminLayout from './components/AdminLayout';
import GroupsPage from './pages/admin/GroupsPage';
import MembersPage from './pages/admin/MembersPage';
import InvitesPage from './pages/admin/InvitesPage';
import AdvisorsPage from './pages/admin/AdvisorsPage';  
import ProfessorsPage from './pages/admin/ProfessorPage';
import SanitizationPage from './pages/admin/SanitizationPage';

import DocumentsPage from './pages/DocumentsPage';
import SubmissionDetailsPage from './pages/SubmissionDetailsPage';
import ReviewPage from './pages/ReviewPage';
import ActivityPage from './pages/admin/ActivityPage';
import IntegrationsPage from './pages/IntegrationsPage';
import './App.css';

const RootRedirect = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes (Unprotected) */}
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          
          {/* Protected Routes (Layout Protected by Firewall) */}
          <Route 
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
                       <Route path="/groups" element={<StudentGroupManagementPage />} />
            <Route path="/all-groups" element={<StudentGroupManagementPage />} />
            <Route path="/documents/upload" element={<StudentSubmissionPage />} />
            <Route path="/documents/:phaseId/:submissionId" element={<StudentSubmissionPage />} />
            <Route path="/documents/:id" element={<SubmissionDetailsPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route
              path="/review"
              element={
                <ProtectedRoute requiredRole="Professor">
                  <ReviewPage />
                </ProtectedRoute>
              }
            />
            <Route path="/coordinator-management" element={<CoordinatorManagementPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route
              path="/phases/schedule"
              element={
                <ProtectedRoute requiredRole="Coordinator">
                  <PhaseSchedulingPage />
                </ProtectedRoute>
              }
            />

            <Route path="/admin" element={
              <ProtectedRoute requiredRole="Coordinator">
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="groups" replace />} />
              <Route path="groups" element={<GroupsPage />} />
              <Route path="members" element={<MembersPage />} />
              <Route path="invites" element={<InvitesPage />} />
              <Route path="advisors" element={<AdvisorsPage />} />
              <Route path="professors" element={<ProfessorsPage />} />
              <Route path="sanitization" element={<SanitizationPage />} />

              <Route path="activity" element={<ActivityPage />} />
            </Route>
          </Route>

          <Route path="/" element={<RootRedirect />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
