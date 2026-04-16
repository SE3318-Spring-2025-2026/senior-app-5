import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import GroupLifecyclePage from './pages/GroupLifecyclePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { Layout } from './components/layout/Layout';
import AdminLayout from './components/AdminLayout';
import GroupsPage from './pages/admin/GroupsPage';
import MembersPage from './pages/admin/MembersPage';
import InvitesPage from './pages/admin/InvitesPage';
import AdvisorsPage from './pages/admin/AdvisorsPage';
import SanitizationPage from './pages/admin/SanitizationPage';
import ActivityPage from './pages/admin/ActivityPage';
import './App.css';

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
            <Route path="/groups" element={<GroupLifecyclePage />} />
            <Route path="/all-groups" element={<GroupLifecyclePage />} />
            <Route path="/documents" element={<div>Documents Section - Coming Soon</div>} />

            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="groups" replace />} />
              <Route path="groups" element={<GroupsPage />} />
              <Route path="members" element={<MembersPage />} />
              <Route path="invites" element={<InvitesPage />} />
              <Route path="advisors" element={<AdvisorsPage />} />
              <Route path="sanitization" element={<SanitizationPage />} />
              <Route path="activity" element={<ActivityPage />} />
            </Route>
          </Route>

          {/* Default Routing */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;