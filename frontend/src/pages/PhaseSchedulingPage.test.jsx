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

 QA---Test-Submission-Schedule-Validation-#77
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

  it('loads and displays the selected phase schedule', async () => {
    renderWithPhases();

    fireEvent.change(await screen.findByLabelText(/^Phase$/i), { target: { value: 'phase-123' } });

    expect(screen.getByText(/Current Schedule/i)).toBeTruthy();
    expect(screen.getByLabelText(/Submission Start/i).value).toBeTruthy();
    expect(screen.getByLabelText(/Submission End/i).value).toBeTruthy();
    expect(screen.getAllByText(/UTC time:/i)).toHaveLength(2);
  });

  it('sets the minimum submissionEnd date based on submissionStart', async () => {
    renderWithPhases();

    fireEvent.change(await screen.findByLabelText(/^Phase$/i), { target: { value: 'phase-123' } });
 main

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

  it('locks phase selection and shows a refreshed schedule summary when the API call succeeds', async () => {
    let resolveUpdate;
    const updatePromise = new Promise((resolve) => {
      resolveUpdate = resolve;
    });

    apiClient.get.mockResolvedValueOnce({ data: mockPhases });
    apiClient.put.mockReturnValueOnce(updatePromise);

    render(<PhaseSchedulingPage />);

    const phaseSelect = await screen.findByLabelText(/^Phase$/i);
    fireEvent.change(phaseSelect, { target: { value: 'phase-123' } });
    fireEvent.change(screen.getByLabelText(/Submission Start/i), { target: { value: '2026-04-26T09:00' } });
    fireEvent.change(screen.getByLabelText(/Submission End/i), { target: { value: '2026-05-03T09:00' } });
    fireEvent.click(screen.getByRole('button', { name: /Update Phase Schedule/i }));

    await waitFor(() => {
      expect(phaseSelect.disabled).toBe(true);
    });

    resolveUpdate({
      data: {
        phaseId: 'phase-123',
        submissionStart: '2026-04-26T09:00:00.000Z',
        submissionEnd: '2026-05-03T09:00:00.000Z',
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/Phase phase-123 schedule updated successfully/i)).toBeTruthy();
    });

    expect(screen.getByText(/Schedule Changes/i)).toBeTruthy();
    expect(apiClient.put).toHaveBeenCalledWith(apiConfig.endpoints.phaseSchedule('phase-123'), {
      submissionStart: expect.stringMatching(/Z$/),
      submissionEnd: expect.stringMatching(/Z$/),
    });
  });

 QA---Test-Submission-Schedule-Validation-#77
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

  it('renders backend array validation messages cleanly', async () => {
    apiClient.get.mockResolvedValueOnce({ data: mockPhases });
    apiClient.put.mockRejectedValueOnce({
      response: { data: { message: ['submissionStart must be a valid ISO date', 'submissionEnd must be a valid ISO date'] } },
    });
 main

    render(<PhaseSchedulingPage />);

    fireEvent.change(await screen.findByLabelText(/^Phase$/i), { target: { value: 'phase-123' } });
    fireEvent.click(screen.getByRole('button', { name: /Update Phase Schedule/i }));

    await waitFor(() => {
      expect(screen.getByText(/submissionStart must be a valid ISO date/i)).toBeTruthy();
      expect(screen.getByText(/submissionEnd must be a valid ISO date/i)).toBeTruthy();
    });
  });
});
