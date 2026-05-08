import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { jwtDecode } from 'jwt-decode';
import authService from '../utils/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  const logout = useCallback(async () => {
    await authService.logout();
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  const login = useCallback(async () => {
    setIsAuthenticated(true);
    try {
      const me = await authService.getCurrentUser();
      setUser(me);
    } catch {
      // token geçerli ama /me başarısız
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      let token = localStorage.getItem('accessToken');

      if (!token) {
        const success = await authService.refresh();
        if (success) {
          token = localStorage.getItem('accessToken');
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }
      } else {
        setIsAuthenticated(true);
      }

      try {
        const me = await authService.getCurrentUser();
        setUser(me);
      } catch {
        setIsAuthenticated(false);
        setUser(null);
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  const contextValue = useMemo(() => ({
    isAuthenticated,
    isLoading,
    user,
    login,
    logout,
  }), [isAuthenticated, isLoading, user, login, logout]);

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