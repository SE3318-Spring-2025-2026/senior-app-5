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
    groupCommittee: (groupId) => `/groups/${groupId}/committee`,
    groupStatus: (groupId) => `/groups/${groupId}/status`,
    advisors: '/advisors',
    requests: '/requests',
    requestById: (requestId) => `/requests/${requestId}`,
    userSearch: '/users/search',
    invites: '/invites/deliver',
    phaseSchedule: (phaseId) => `/phases/${phaseId}/schedule`,
    advisorValidation: '/admin/advisor-validation',
    sanitizationExecute: '/admin/sanitization/execute',
    submissions: {
      mine: '/submissions/me',
      uploadDocument: (submissionId) => `/submissions/${submissionId}/documents`,
    },
    schedules: '/schedules',
    schedulesActive: '/schedules/active',
    committees: '/committees',
    committeeById: (committeeId) => `/committees/${committeeId}`,
    committeeJuryMembers: (committeeId) => `/committees/${committeeId}/jury-members`,
    committeeJuryMemberByUser: (committeeId, userId) => `/committees/${committeeId}/jury-members/${userId}`,
    committeeAdvisors: (committeeId) => `/committees/${committeeId}/advisors`,
    committeeAdvisorByUser: (committeeId, advisorUserId) => `/committees/${committeeId}/advisors/${advisorUserId}`,
    committeeGroups: (committeeId) => `/committees/${committeeId}/groups`,
    committeeGroupById: (committeeId, groupId) => `/committees/${committeeId}/groups/${groupId}`,
    activityLogs: '/admin/activity',
    adminProfessors: '/auth/admin/professors',
    groupFinalGrade: (groupId) => `/groups/${groupId}/final-grade`,
    studentFinalGrade: (studentId) => `/students/${studentId}/final-grade`,
    groupGradeHistory: (groupId) => `/groups/${groupId}/grade-history`,
  },  
};

export default apiConfig;
