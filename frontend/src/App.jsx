import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import MarkdownEditorPage from './pages/MarkdownEditorPage';
import GradeDisplayPage from './pages/GradeDisplayPage';
import ReviewPage from './pages/ReviewPage';
import ActivityPage from './pages/admin/ActivityPage';
import CommitteesPage from './pages/admin/CommitteesPage';
import CommitteeDetailPage from './pages/admin/CommitteeDetailPage';
import GroupDetailPage from './pages/admin/GroupDetailPage';
import IntegrationsPage from './pages/IntegrationsPage';
import AdvisorRequestsPage from './pages/AdvisorRequestsPage';
import SprintEvaluationPage from './pages/SprintEvaluationPage';
import RubricManagementPage from './pages/RubricManagementPage';
import SprintBuilderPage from './pages/SprintBuilderPage';
import ScrumManagementPage from './pages/ScrumManagementPage';
import DeliverableManagementPage from './pages/DeliverableManagementPage';
import DeliverableGradingPage from './pages/DeliverableGradingPage';
import AdvisorSprintPanel from './pages/AdvisorSprintPanel';
import SprintFinalizePage from './pages/SprintFinalizePage';

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
            <Route path="/documents/:submissionId/markdown" element={<MarkdownEditorPage />} />
            <Route path="/documents/:phaseId/:submissionId" element={<StudentSubmissionPage />} />
            <Route path="/documents/:id" element={<SubmissionDetailsPage />} />
            <Route path="/documents" element={<StudentSubmissionPage />} />
            <Route path="/my-submissions" element={<DocumentsPage />} />
            <Route path="/grades" element={<GradeDisplayPage />} />
            <Route path="/professor/submissions" element={<Navigate to="/review" replace />} />
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
            <Route path="/scrum" element={<ScrumManagementPage />} />
            <Route path="/advisor/requests" element={<AdvisorRequestsPage />} />
            <Route
              path="/advisor/sprint-evaluation"
              element={
                <ProtectedRoute requiredRole="Professor">
                  <SprintEvaluationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/professor/deliverable-grading"
              element={
                <ProtectedRoute requiredRole="Professor">
                  <DeliverableGradingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/advisor/sprint-panel"
              element={
                <ProtectedRoute requiredRoles={['Professor', 'Coordinator']}>
                  <AdvisorSprintPanel />
                </ProtectedRoute>
              }
            />
            <Route
              path="/coordinator/sprint-finalize"
              element={
                <ProtectedRoute requiredRole="Coordinator">
                  <SprintFinalizePage />
                </ProtectedRoute>
              }
            />
            <Route path="/coordinator/advisor-schedule" element={<Navigate to="/coordinator-management" replace />} />
            <Route path="/coordinator/sprint-builder" element={
              <ProtectedRoute requiredRole="Coordinator">
                <SprintBuilderPage />
              </ProtectedRoute>
            } />
            <Route path="/coordinator/sprint-schedule" element={<Navigate to="/coordinator/sprint-builder" replace />} />
            <Route
              path="/coordinator/rubrics"
              element={
                <ProtectedRoute requiredRole="Coordinator">
                  <RubricManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/coordinator/sprint-config"
              element={<Navigate to="/coordinator/sprint-builder" replace />}
            />
            <Route
              path="/coordinator/deliverables"
              element={
                <ProtectedRoute requiredRole="Coordinator">
                  <DeliverableManagementPage />
                </ProtectedRoute>
              }
            />
            <Route path="/advisors" element={<Navigate to="/admin/advisors" replace />} />
            <Route
              path="/committees"
              element={
                <ProtectedRoute requiredRole="Coordinator">
                  <CommitteesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/phases"
              element={
                <ProtectedRoute requiredRole="Coordinator">
                  <PhaseSchedulingPage />
                </ProtectedRoute>
              }
            />
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
              <Route path="groups/:groupId" element={<GroupDetailPage />} />
              <Route path="members" element={<MembersPage />} />
              <Route path="invites" element={<InvitesPage />} />
              <Route path="advisors" element={<AdvisorsPage />} />
              <Route path="professors" element={<ProfessorsPage />} />
              <Route path="committees" element={<CommitteesPage />} />
              <Route path="committees/:committeeId" element={<CommitteeDetailPage />} />
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
