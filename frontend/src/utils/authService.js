import apiClient from './apiClient';
import apiConfig from '../config/api';

export const authService = {
  /**
   * Register a new user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise} - User data and auth status
   */
  async register(email, password) {
    try {
      const response = await apiClient.post(apiConfig.endpoints.auth.register, {
        email,
        password,
      });
      
      // Store user info (but NOT password)
      if (response.data?.id && response.data?.email) {
        localStorage.setItem('userEmail', response.data.email);
      }
      
      return response.data;
    } catch (error) {
      // Handle and transform error
      const errorMessage = 
        error.response?.data?.message || 
        error.response?.data?.error ||
        error.message ||
        'Registration failed';
      
      throw new Error(errorMessage);
    }
  },

  async registerProfessor(name, email, role) {
    try {
      const response = await apiClient.post(apiConfig.endpoints.adminProfessors, {
        name,
        email,
        role,
      });
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Professor creation failed';
      throw new Error(errorMessage);
    }
  },

  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise} - Access token
   */
  async login(email, password) {
    try {
      const response = await apiClient.post(apiConfig.endpoints.auth.login, {
        email,
        password,
      });
      
      if (response.data?.accessToken) {
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('userEmail', email);
      }
      
      return response.data;
    } catch (error) {
      const errorMessage = 
        error.response?.data?.message || 
        error.response?.data?.error ||
        error.message ||
        'Login failed';
      
      throw new Error(errorMessage);
    }
  },

  /**
   * Get current authenticated user
   * @returns {Promise} - Current user data
   */
  async getCurrentUser() {
    try {
      const response = await apiClient.get(apiConfig.endpoints.auth.me);
      return response.data;
    } catch (error) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userEmail');
      throw error;
    }
  },

  /**
   * Logout user (clears local storage)
   */
  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userEmail');
  },

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!localStorage.getItem('accessToken');
  },

  /**
   * Get stored user email
   * @returns {string|null}
   */
  getUserEmail() {
    return localStorage.getItem('userEmail');
  },
};

export default authService;
