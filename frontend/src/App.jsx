import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import GroupLifecyclePage from './pages/GroupLifecyclePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import AdminLayout from './components/AdminLayout';
import GroupsPage from './pages/admin/GroupsPage';
import MembersPage from './pages/admin/MembersPage';
import InvitesPage from './pages/admin/InvitesPage';
import AdvisorsPage from './pages/admin/AdvisorsPage';
import SanitizationPage from './pages/admin/SanitizationPage';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/groups" element={<GroupLifecyclePage />} />
        
        {/* Admin routes wrapped in AdminLayout */}
        <Route
          path="/admin/groups"
          element={
            <AdminLayout>
              <GroupsPage />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/members"
          element={
            <AdminLayout>
              <MembersPage />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/invites"
          element={
            <AdminLayout>
              <InvitesPage />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/advisors"
          element={
            <AdminLayout>
              <AdvisorsPage />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/sanitization"
          element={
            <AdminLayout>
              <SanitizationPage />
            </AdminLayout>
          }
        />
        
        <Route path="/admin" element={<Navigate to="/admin/groups" replace />} />
        <Route path="/" element={<Navigate to="/register" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
