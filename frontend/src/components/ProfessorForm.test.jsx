import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProfessorForm from './ProfessorForm';
import apiClient from '../utils/apiClient';

vi.mock('../utils/apiClient');

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ProfessorForm smoke tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits valid professor registration payload', async () => {
    apiClient.post.mockResolvedValueOnce({
      data: { id: '1', email: 'prof@example.com', role: 'Professor' },
    });

    render(<ProfessorForm />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'prof@example.com' },
    });

    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'StrongPass1' },
    });

    fireEvent.change(screen.getByLabelText(/role/i), {
      target: { value: 'Professor' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create professor/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/auth/admin/professors', {
        email: 'prof@example.com',
        password: 'StrongPass1',
        role: 'Professor',
      });
    });


    expect(apiClient.post).toHaveBeenCalledTimes(1);
  });

  it('shows inline error and does not call API when password is weak', async () => {
    render(<ProfessorForm />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'prof@example.com' },
    });

    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'abc' }, // short password
    });

    fireEvent.change(screen.getByLabelText(/role/i), {
      target: { value: 'Professor' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create professor/i }));

    
    expect(await screen.findByText(/at least 8 characters/i)).toBeTruthy(); // should show the error message
    
    expect(apiClient.post).not.toHaveBeenCalled(); // no request should be made
  });
});