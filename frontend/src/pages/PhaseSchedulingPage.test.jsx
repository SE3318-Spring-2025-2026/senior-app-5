import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PhaseSchedulingPage from './PhaseSchedulingPage';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';

vi.mock('../utils/apiClient');

const mockPhases = [
  {
    phaseId: 'phase-123',
    submissionStart: '2026-04-25T09:00:00.000Z',
    submissionEnd: '2026-05-02T09:00:00.000Z',
  },
  {
    phaseId: 'phase-empty',
    submissionStart: null,
    submissionEnd: null,
  },
];

const renderWithPhases = () => {
  apiClient.get.mockResolvedValueOnce({ data: mockPhases });
  render(<PhaseSchedulingPage />);
};

describe('PhaseSchedulingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads phases and removes issue-specific UI copy', async () => {
    renderWithPhases();

    expect(screen.queryByText(/Issue #78/i)).toBeNull();
    expect(await screen.findByRole('option', { name: 'phase-123' })).toBeTruthy();
    expect(apiClient.get).toHaveBeenCalledWith(apiConfig.endpoints.phases);
  });

  it('disables submit until a phase is selected', async () => {
    renderWithPhases();

    await screen.findByRole('option', { name: 'phase-123' });
    const submitButton = screen.getByRole('button', { name: /Update Phase Schedule/i });
    expect(submitButton.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/^Phase$/i), { target: { value: 'phase-123' } });

    expect(submitButton.disabled).toBe(false);
  });

  it('loads and displays the selected phase schedule', async () => {
    renderWithPhases();

    fireEvent.change(await screen.findByLabelText(/^Phase$/i), { target: { value: 'phase-123' } });

    expect(screen.getByText(/Current Schedule/i)).toBeTruthy();
    expect(screen.getByLabelText(/Submission Start/i).value).toBeTruthy();
    expect(screen.getByLabelText(/Submission End/i).value).toBeTruthy();
  });

  it('sets the minimum submissionEnd date based on submissionStart', async () => {
    renderWithPhases();

    fireEvent.change(await screen.findByLabelText(/^Phase$/i), { target: { value: 'phase-123' } });

    const startInput = screen.getByLabelText(/Submission Start/i);
    const endInput = screen.getByLabelText(/Submission End/i);

    fireEvent.change(startInput, { target: { value: '2026-04-25T09:00' } });

    expect(endInput.min).toBe('2026-04-25T09:00');
  });

  it('displays inline validation errors when required dates are missing', async () => {
    renderWithPhases();

    fireEvent.change(await screen.findByLabelText(/^Phase$/i), { target: { value: 'phase-empty' } });
    fireEvent.click(screen.getByRole('button', { name: /Update Phase Schedule/i }));

    await waitFor(() => {
      expect(screen.getByText(/Submission start is required/i)).toBeTruthy();
      expect(screen.getByText(/Submission end is required/i)).toBeTruthy();
    });
  });

  it('displays a validation error when submissionEnd equals submissionStart', async () => {
    renderWithPhases();

    fireEvent.change(await screen.findByLabelText(/^Phase$/i), { target: { value: 'phase-123' } });
    fireEvent.change(screen.getByLabelText(/Submission Start/i), { target: { value: '2026-04-25T09:00' } });
    fireEvent.change(screen.getByLabelText(/Submission End/i), { target: { value: '2026-04-25T09:00' } });
    fireEvent.click(screen.getByRole('button', { name: /Update Phase Schedule/i }));

    await waitFor(() => {
      expect(screen.getByText(/Submission end date must be strictly after the submission start date/i)).toBeTruthy();
    });
  });

  it('resets edited values to the selected phase schedule', async () => {
    renderWithPhases();

    fireEvent.change(await screen.findByLabelText(/^Phase$/i), { target: { value: 'phase-123' } });

    const startInput = screen.getByLabelText(/Submission Start/i);
    const originalStart = startInput.value;

    fireEvent.change(startInput, { target: { value: '2026-04-26T10:00' } });
    fireEvent.click(screen.getByRole('button', { name: /Reset/i }));

    expect(startInput.value).toBe(originalStart);
  });

  it('shows a success message and refreshed result when the API call succeeds', async () => {
    apiClient.get.mockResolvedValueOnce({ data: mockPhases });
    apiClient.put.mockResolvedValueOnce({
      data: {
        phaseId: 'phase-123',
        submissionStart: '2026-04-26T09:00:00.000Z',
        submissionEnd: '2026-05-03T09:00:00.000Z',
      },
    });

    render(<PhaseSchedulingPage />);

    fireEvent.change(await screen.findByLabelText(/^Phase$/i), { target: { value: 'phase-123' } });
    fireEvent.change(screen.getByLabelText(/Submission Start/i), { target: { value: '2026-04-26T09:00' } });
    fireEvent.change(screen.getByLabelText(/Submission End/i), { target: { value: '2026-05-03T09:00' } });
    fireEvent.click(screen.getByRole('button', { name: /Update Phase Schedule/i }));

    await waitFor(() => {
      expect(screen.getByText(/Phase phase-123 schedule updated successfully/i)).toBeTruthy();
    });

    expect(screen.getByText(/Updated Phase/i)).toBeTruthy();
    expect(apiClient.put).toHaveBeenCalledWith(apiConfig.endpoints.phaseSchedule('phase-123'), {
      submissionStart: expect.stringMatching(/Z$/),
      submissionEnd: expect.stringMatching(/Z$/),
    });
  });

  it('renders backend array validation messages cleanly', async () => {
    apiClient.get.mockResolvedValueOnce({ data: mockPhases });
    apiClient.put.mockRejectedValueOnce({
      response: { data: { message: ['submissionStart must be a valid ISO date', 'submissionEnd must be a valid ISO date'] } },
    });

    render(<PhaseSchedulingPage />);

    fireEvent.change(await screen.findByLabelText(/^Phase$/i), { target: { value: 'phase-123' } });
    fireEvent.click(screen.getByRole('button', { name: /Update Phase Schedule/i }));

    await waitFor(() => {
      expect(screen.getByText(/submissionStart must be a valid ISO date/i)).toBeTruthy();
      expect(screen.getByText(/submissionEnd must be a valid ISO date/i)).toBeTruthy();
    });
  });
});
