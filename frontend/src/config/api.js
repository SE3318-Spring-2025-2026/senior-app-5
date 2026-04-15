/**
 * API configuration for the application
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

export const apiConfig = {
  baseURL: API_BASE_URL,
  endpoints: {
    auth: {
      register: '/auth/register',
      login: '/auth/login',
      me: '/auth/me',
      passwordResetRequest: '/auth/password-reset/request',
      passwordResetConfirm: '/auth/password-reset/confirm',
    },
    groups: '/groups',
    groupMembers: (groupId) => `/groups/${groupId}/members`,
    phaseById: (phaseId) => `/phases/${phaseId}`,
    submissionDocuments: (submissionId) => `/submissions/${submissionId}/documents`,
    invites: '/invites/deliver',
    advisorValidation: '/admin/advisor-validation',
    sanitizationExecute: '/admin/sanitization/execute',
  },
};

export default apiConfig;
