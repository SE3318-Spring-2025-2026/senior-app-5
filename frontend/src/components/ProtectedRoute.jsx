import { Navigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../context/AuthContext';

const normalizeRole = (role) => String(role || '').trim().toLowerCase();

export const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  let user = null;
  try {
    const userStr = localStorage.getItem('user');
    user = userStr ? JSON.parse(userStr) : null;
  } catch {
    user = null;
  }

  if (requiredRole && normalizeRole(user?.role) !== normalizeRole(requiredRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  requiredRole: PropTypes.string,
};