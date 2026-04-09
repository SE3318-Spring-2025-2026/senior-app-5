/**
 * API configuration for the application
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

export const apiConfig = {
  baseURL: API_BASE_URL,
  endpoints: {
    auth: {
      register: '/auth/register',
      login: '/auth/login',
      me: '/auth/me',
    },
    groups: '/groups',
    groupMembers: (groupId) => `/groups/${groupId}/members`,
    invites: '/invites/deliver',
    advisorValidation: '/admin/advisor-validation',
    sanitizationExecute: '/admin/sanitization/execute',
  },
};

export default apiConfig;
