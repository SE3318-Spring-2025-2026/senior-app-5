import apiClient from './apiClient';
import apiConfig from '../config/api';

export const passwordResetService = {
  /**
   * Request password reset by email
   * @param {string} email - User email address
   * @returns {Promise} - Response with success message
   */
  async requestPasswordReset(email) {
    try {
      const response = await apiClient.post(
        apiConfig.endpoints.auth.passwordResetRequest,
        { email }
      );
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to request password reset';

      throw new Error(errorMessage);
    }
  },

  /**
   * Confirm password reset with token and new password
   * @param {string} token - Reset token from email
   * @param {string} newPassword - New password
   * @returns {Promise} - Response with success message
   */
  async confirmPasswordReset(token, newPassword) {
    try {
      const response = await apiClient.post(
        apiConfig.endpoints.auth.passwordResetConfirm,
        {
          token,
          newPassword,
        }
      );
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to reset password';

      throw new Error(errorMessage);
    }
  },
};

export default passwordResetService;
