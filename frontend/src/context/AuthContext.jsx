import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { jwtDecode } from 'jwt-decode';
import authService from '../utils/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());

  const logout = useCallback(() => {
    authService.logout();
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) {
          console.warn('Token expired. Logging out automatically...');
          logout();
        }
      } catch (error) {
        console.error('Invalid token format detected. Forcing logout...', error);
        logout();
      }
    }
  }, [logout]);

  const login = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  
  const contextValue = useMemo(() => ({
    isAuthenticated,
    login,
    logout
  }), [isAuthenticated, login, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};


AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useAuth = () => useContext(AuthContext);