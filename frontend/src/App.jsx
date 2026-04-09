import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import GroupLifecyclePage from './pages/GroupLifecyclePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/groups" element={<GroupLifecyclePage />} />
        <Route path="/" element={<Navigate to="/register" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
