import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PhaseSchedulingPage from './PhaseSchedulingPage';
import apiClient from '../utils/apiClient';

vi.mock('../utils/apiClient');

describe('PhaseSchedulingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set the minimum submissionEnd date based on submissionStart', () => {
    render(<PhaseSchedulingPage />);

    const startInput = screen.getByLabelText(/Submission Start/i);
    const endInput = screen.getByLabelText(/Submission End/i);

    fireEvent.change(startInput, { target: { value: '2026-04-25T09:00' } });

    expect(endInput.value).toBeTruthy();
    expect(endInput.min).toBe('2026-04-25T09:00');
  });

  it('should update submissionEnd minimum when submissionStart changes later', () => {
    render(<PhaseSchedulingPage />);

    const startInput = screen.getByLabelText(/Submission Start/i);
    const endInput = screen.getByLabelText(/Submission End/i);

    fireEvent.change(startInput, { target: { value: '2026-04-25T09:00' } });
    fireEvent.change(startInput, { target: { value: '2026-04-28T10:30' } });

    expect(endInput.min).toBe('2026-04-28T10:30');
  });

  it('should render updated phase JSON after a successful API call', async () => {
    apiClient.put.mockResolvedValueOnce({
      data: {
        phaseId: 'phase-123',
        submissionStart: '2026-04-25T09:00:00.000Z',
        submissionEnd: '2026-05-02T09:00:00.000Z',
      },
    });

    render(<PhaseSchedulingPage />);

    const phaseIdInput = screen.getByLabelText(/Phase ID/i);
    const submitButton = screen.getByRole('button', { name: /Update Phase Schedule/i });

    fireEvent.change(phaseIdInput, { target: { value: 'phase-123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Updated Phase/i)).toBeTruthy();
      expect(screen.getByText(/"phaseId": "phase-123"/i)).toBeTruthy();
    });
  });

  it('should display a required field error when submissionEnd is missing', async () => {
    apiClient.put.mockResolvedValueOnce({ data: {} });

    render(<PhaseSchedulingPage />);

    const endInput = screen.getByLabelText(/Submission End/i);
    const submitButton = screen.getByRole('button', { name: /Update Phase Schedule/i });

    fireEvent.change(endInput, { target: { value: '' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Start and end date are required/i)).toBeTruthy();
    });
  });

  it('should display a required field error when submissionStart is missing', async () => {
    apiClient.put.mockResolvedValueOnce({ data: {} });

    render(<PhaseSchedulingPage />);

    const startInput = screen.getByLabelText(/Submission Start/i);
    const submitButton = screen.getByRole('button', { name: /Update Phase Schedule/i });

    fireEvent.change(startInput, { target: { value: '' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Start and end date are required/i)).toBeTruthy();
    });
  });

  it('should display a validation error when submissionEnd equals submissionStart', async () => {
    render(<PhaseSchedulingPage />);

    const phaseIdInput = screen.getByLabelText(/Phase ID/i);
    const startInput = screen.getByLabelText(/Submission Start/i);
    const endInput = screen.getByLabelText(/Submission End/i);
    const submitButton = screen.getByRole('button', { name: /Update Phase Schedule/i });

    fireEvent.change(phaseIdInput, { target: { value: 'phase-123' } });
    fireEvent.change(startInput, { target: { value: '2026-04-25T09:00' } });
    fireEvent.change(endInput, { target: { value: '2026-04-25T09:00' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Submission end date must be strictly after the submission start date/i)).toBeTruthy();
    });
  });

  it('should show a success toast and result when the API call succeeds', async () => {
    apiClient.put.mockResolvedValueOnce({
      data: {
        phaseId: 'phase-123',
        submissionStart: '2026-04-25T09:00:00.000Z',
        submissionEnd: '2026-05-02T09:00:00.000Z',
      },
    });

    render(<PhaseSchedulingPage />);

    const phaseIdInput = screen.getByLabelText(/Phase ID/i);
    const submitButton = screen.getByRole('button', { name: /Update Phase Schedule/i });

    fireEvent.change(phaseIdInput, { target: { value: 'phase-123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Phase phase-123 schedule updated successfully/i)).toBeTruthy();
    });

    expect(screen.getByText(/Updated Phase/i)).toBeTruthy();
    expect(apiClient.put).toHaveBeenCalled();
  });

  it('should render backend error messages when the schedule update fails', async () => {
    apiClient.put.mockRejectedValueOnce({
      response: { data: { message: 'Phase not found' } },
    });

    render(<PhaseSchedulingPage />);

    const phaseIdInput = screen.getByLabelText(/Phase ID/i);
    const submitButton = screen.getByRole('button', { name: /Update Phase Schedule/i });

    fireEvent.change(phaseIdInput, { target: { value: 'invalid-phase' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Phase not found/i)).toBeTruthy();
    });
  });

  it('should display a graceful error when the backend fails unexpectedly', async () => {
    apiClient.put.mockRejectedValueOnce(new Error('Internal server error'));

    render(<PhaseSchedulingPage />);

    const phaseIdInput = screen.getByLabelText(/Phase ID/i);
    const submitButton = screen.getByRole('button', { name: /Update Phase Schedule/i });

    fireEvent.change(phaseIdInput, { target: { value: 'phase-123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Internal server error/i)).toBeTruthy();
    });
  });

  it('should display an invalid date error when a malformed date is entered', async () => {
    render(<PhaseSchedulingPage />);

    const startInput = screen.getByLabelText(/Submission Start/i);
    const endInput = screen.getByLabelText(/Submission End/i);
    const submitButton = screen.getByRole('button', { name: /Update Phase Schedule/i });

    fireEvent.change(startInput, { target: { value: 'invalid-date' } });
    fireEvent.change(endInput, { target: { value: '2026-04-30T12:00' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Please enter valid submission start and end dates/i)).toBeTruthy();
    });
  });
});
