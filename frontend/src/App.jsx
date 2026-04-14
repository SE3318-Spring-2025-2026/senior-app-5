import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import GroupLifecyclePage from './pages/GroupLifecyclePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';


import DashboardPage from './pages/DashboardPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { Layout } from './components/layout/Layout';

import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/groups" element={<GroupLifecyclePage />} />
          
          
          <Route path="/all-groups" element={<GroupLifecyclePage />} />
          
          <Route path="/documents" element={<div>Documents Section - Coming Soon</div>} />
        </Route>

        
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
export default App;