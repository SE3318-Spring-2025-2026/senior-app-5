import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';


import DashboardPage from './pages/DashboardPage';


import GroupLifecyclePage from './pages/GroupLifecyclePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          
          <Route path="/dashboard" element={<DashboardPage />} />
          
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/groups" element={<GroupLifecyclePage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;