import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { jwtDecode } from 'jwt-decode';
import authService from '../utils/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    authService.logout();
    setIsAuthenticated(false);
  }, []);

  const login = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      
      // If we don't have an access token, try to refresh from cookie before giving up
      if (!token) {
        const success = await authService.refresh();
        if (success) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } else {
        // We have a token, but it might be from a previous session
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const contextValue = useMemo(() => ({
    isAuthenticated,
    isLoading,
    login,
    logout
  }), [isAuthenticated, isLoading, login, logout]);

  if (isLoading) {
    // Show nothing or a simple loader during the initial auth check
    return null; 
  }

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