import { Navigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../context/AuthContext';
import { hasAnyRole, hasRole } from '../utils/roleUtils';

export const ProtectedRoute = ({ children, requiredRole, requiredRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const roleMismatch =
    (requiredRole && !hasRole(user?.role, requiredRole)) ||
    (requiredRoles && !hasAnyRole(user?.role, requiredRoles));

  if (roleMismatch) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  requiredRole: PropTypes.string,
  requiredRoles: PropTypes.arrayOf(PropTypes.string),
};