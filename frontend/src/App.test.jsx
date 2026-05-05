import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Outlet } from 'react-router-dom';
import App from './App';

vi.mock('./context/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock('./components/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }) => children,
}));

vi.mock('./components/layout/Layout', () => ({
  Layout: () => <Outlet />,
}));

vi.mock('./pages/DocumentsPage', () => ({
  default: () => <div>Documents List Page</div>,
}));

vi.mock('./pages/StudentSubmissionPage', () => ({
  default: () => <div>Student Upload Page</div>,
}));

vi.mock('./pages/SubmissionDetailsPage', () => ({
  default: () => <div>Submission Details Page</div>,
}));

vi.mock('./pages/StudentGroupManagementPage', () => ({
  default: () => <div>Student Group Management Page</div>,
}));

vi.mock('./pages/CoordinatorManagementPage', () => ({
  default: () => <div>Coordinator Management Page</div>,
}));

vi.mock('./pages/RegisterPage', () => ({
  default: () => <div>Register Page</div>,
}));

vi.mock('./pages/LoginPage', () => ({
  default: () => <div>Login Page</div>,
}));

vi.mock('./pages/DashboardPage', () => ({
  default: () => <div>Dashboard Page</div>,
}));

vi.mock('./pages/PhaseSchedulingPage', () => ({
  default: () => <div>Phase Scheduling Page</div>,
}));

vi.mock('./pages/ForgotPasswordPage', () => ({
  ForgotPasswordPage: () => <div>Forgot Password Page</div>,
}));

vi.mock('./pages/ResetPasswordPage', () => ({
  ResetPasswordPage: () => <div>Reset Password Page</div>,
}));

vi.mock('./components/AdminLayout', () => ({
  default: () => <Outlet />,
}));

vi.mock('./pages/admin/GroupsPage', () => ({
  default: () => <div>Admin Groups Page</div>,
}));

vi.mock('./pages/admin/MembersPage', () => ({
  default: () => <div>Admin Members Page</div>,
}));

vi.mock('./pages/admin/InvitesPage', () => ({
  default: () => <div>Admin Invites Page</div>,
}));

vi.mock('./pages/admin/AdvisorsPage', () => ({
  default: () => <div>Admin Advisors Page</div>,
}));

vi.mock('./pages/admin/ProfessorPage', () => ({
  default: () => <div>Admin Professors Page</div>,
}));

vi.mock('./pages/admin/SanitizationPage', () => ({
  default: () => <div>Admin Sanitization Page</div>,
}));

vi.mock('./pages/admin/ActivityPage', () => ({
  default: () => <div>Admin Activity Page</div>,
}));

describe('App document routes', () => {
  it('renders the documents list at /documents', () => {
    window.history.pushState({}, '', '/documents');

    render(<App />);

    expect(screen.getByText('Documents List Page')).toBeTruthy();
  });

  it('renders the upload form at /documents/upload', () => {
    window.history.pushState({}, '', '/documents/upload');

    render(<App />);

    expect(screen.getByText('Student Upload Page')).toBeTruthy();
  });

  it('renders submission details at /documents/:id', () => {
    window.history.pushState({}, '', '/documents/submission-123');

    render(<App />);

    expect(screen.getByText('Submission Details Page')).toBeTruthy();
  });
});
