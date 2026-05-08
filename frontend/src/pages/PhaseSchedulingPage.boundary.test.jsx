import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PhaseSchedulingPage from './PhaseSchedulingPage';
import apiClient from '../config/api';
import apiConfig from '../config/api';

vi.mock('../config/api');

/**
 * Boundary Testing for Phase Scheduling Page - Deadline Enforcement
 * Tests the UI's ability to enforce and display deadline constraints
 * aligned with backend validation.
 */
describe('PhaseSchedulingPage - Deadline Boundary Testing', () => {
  // Fixed reference time for consistent testing
  const FIXED_NOW = new Date('2026-05-15T12:00:00Z');
  const ONE_SECOND_MS = 1000;
  const ONE_MINUTE_MS = 60 * 1000;
  const ONE_HOUR_MS = 60 * 60 * 1000;

  const mockPhases = [
    {
      phaseId: 'boundary-phase-1h-window',
      name: 'Phase 1H Window',
      submissionStart: new Date(FIXED_NOW.getTime() - ONE_HOUR_MS).toISOString(),
      submissionEnd: new Date(FIXED_NOW.getTime() + ONE_HOUR_MS).toISOString(),
    },
    {
      phaseId: 'boundary-phase-closed',
      name: 'Phase Already Closed',
      submissionStart: new Date(FIXED_NOW.getTime() - 2 * ONE_HOUR_MS).toISOString(),
      submissionEnd: new Date(FIXED_NOW.getTime() - ONE_HOUR_MS).toISOString(),
    },
    {
      phaseId: 'boundary-phase-upcoming',
      name: 'Phase Upcoming',
      submissionStart: new Date(FIXED_NOW.getTime() + ONE_HOUR_MS).toISOString(),
      submissionEnd: new Date(FIXED_NOW.getTime() + 2 * ONE_HOUR_MS).toISOString(),
    },
    {
      phaseId: 'boundary-phase-exact-now',
      name: 'Phase Exact Now',
      submissionStart: FIXED_NOW.toISOString(),
      submissionEnd: new Date(FIXED_NOW.getTime() + ONE_HOUR_MS).toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock API responses
    apiClient.get.mockResolvedValueOnce({ data: mockPhases });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  /**
   * 🟢 POSITIVE SCENARIOS: Valid date updates within the submission window
   */
  describe('✅ Positive: Valid Schedule Updates', () => {
    it('should allow update with submissionEnd exactly 1 second after submissionStart', async () => {
      apiClient.get.mockResolvedValueOnce({ data: mockPhases });
      render(<PhaseSchedulingPage />);

      // Select the open phase
      fireEvent.change(await screen.findByLabelText(/^Phase$/i), {
        target: { value: 'boundary-phase-1h-window' },
      });

      await waitFor(() => {
        expect(screen.getByText(/Current Schedule/i)).toBeTruthy();
      });

      // Set submissionStart
      const startInput = screen.getByLabelText(/Submission Start/i);
      fireEvent.change(startInput, { target: { value: '2026-05-15T12:00' } });

      // Set submissionEnd to exactly 1 second later
      const endInput = screen.getByLabelText(/Submission End/i);
      fireEvent.change(endInput, { target: { value: '2026-05-15T12:00:01' } });

      // Verify the form validates (no error shown)
      const submitButton = screen.getByRole('button', { name: /Update Phase Schedule/i });
      expect(submitButton.disabled).toBe(false);
    });

    it('should allow update with submissionEnd 1 minute after submissionStart', async () => {
      apiClient.get.mockResolvedValueOnce({ data: mockPhases });
      render(<PhaseSchedulingPage />);

      fireEvent.change(await screen.findByLabelText(/^Phase$/i), {
        target: { value: 'boundary-phase-1h-window' },
      });

      await waitFor(() => {
        expect(screen.getByText(/Current Schedule/i)).toBeTruthy();
      });

      const startInput = screen.getByLabelText(/Submission Start/i);
      const endInput = screen.getByLabelText(/Submission End/i);

      fireEvent.change(startInput, { target: { value: '2026-05-15T12:00' } });
      fireEvent.change(endInput, { target: { value: '2026-05-15T12:01' } });

      const submitButton = screen.getByRole('button', { name: /Update Phase Schedule/i });
      expect(submitButton.disabled).toBe(false);
    });

    it('should allow update with submissionEnd 1 hour after submissionStart', async () => {
      apiClient.get.mockResolvedValueOnce({ data: mockPhases });
      render(<PhaseSchedulingPage />);

      fireEvent.change(await screen.findByLabelText(/^Phase$/i), {
        target: { value: 'boundary-phase-1h-window' },
      });

      await waitFor(() => {
        expect(screen.getByText(/Current Schedule/i)).toBeTruthy();
      });

      const startInput = screen.getByLabelText(/Submission Start/i);
      const endInput = screen.getByLabelText(/Submission End/i);

      fireEvent.change(startInput, { target: { value: '2026-05-15T12:00' } });
      fireEvent.change(endInput, { target: { value: '2026-05-15T13:00' } });

      const submitButton = screen.getByRole('button', { name: /Update Phase Schedule/i });
      expect(submitButton.disabled).toBe(false);
    });
  });

  /**
   * 🟡 EXACT CUTOFF: The boundary between valid and invalid
   */
  describe('🔍 Exact Cutoff: Valid vs. Invalid Boundary', () => {
    it('should REJECT submissionEnd equal to submissionStart (400)', async () => {
      apiClient.get.mockResolvedValueOnce({ data: mockPhases });
      render(<PhaseSchedulingPage />);

      fireEvent.change(await screen.findByLabelText(/^Phase$/i), {
        target: { value: 'boundary-phase-1h-window' },
      });

      await waitFor(() => {
        expect(screen.getByText(/Current Schedule/i)).toBeTruthy();
      });

      const startInput = screen.getByLabelText(/Submission Start/i);
      const endInput = screen.getByLabelText(/Submission End/i);
      const submitButton = screen.getByRole('button', { name: /Update Phase Schedule/i });

      // Set both to the same time
      fireEvent.change(startInput, { target: { value: '2026-05-15T12:00' } });
      fireEvent.change(endInput, { target: { value: '2026-05-15T12:00' } });
      fireEvent.click(submitButton);

      // Verify validation error is displayed
      await waitFor(() => {
        expect(
          screen.getByText(/Submission end date must be strictly after the submission start date/i)
        ).toBeTruthy();
      });
    });

    it('should update the minimum endDate input dynamically when startDate changes', async () => {
      apiClient.get.mockResolvedValueOnce({ data: mockPhases });
      render(<PhaseSchedulingPage />);

      fireEvent.change(await screen.findByLabelText(/^Phase$/i), {
        target: { value: 'boundary-phase-1h-window' },
      });

      await waitFor(() => {
        expect(screen.getByText(/Current Schedule/i)).toBeTruthy();
      });

      const startInput = screen.getByLabelText(/Submission Start/i);
      const endInput = screen.getByLabelText(/Submission End/i);

      fireEvent.change(startInput, { target: { value: '2026-05-16T10:00' } });

      // The endInput's min attribute should be updated to match startInput
      expect(endInput.min).toBe('2026-05-16T10:00');
    });
  });

  /**
   * 🔴 NEGATIVE SCENARIOS: Invalid schedule configurations
   */
  describe('❌ Negative: Invalid Schedule Updates', () => {
    it('should REJECT submissionEnd before submissionStart', async () => {
      apiClient.get.mockResolvedValueOnce({ data: mockPhases });
      render(<PhaseSchedulingPage />);

      fireEvent.change(await screen.findByLabelText(/^Phase$/i), {
        target: { value: 'boundary-phase-1h-window' },
      });

      await waitFor(() => {
        expect(screen.getByText(/Current Schedule/i)).toBeTruthy();
      });

      const startInput = screen.getByLabelText(/Submission Start/i);
      const endInput = screen.getByLabelText(/Submission End/i);
      const submitButton = screen.getByRole('button', { name: /Update Phase Schedule/i });

      fireEvent.change(startInput, { target: { value: '2026-05-15T13:00' } });
      fireEvent.change(endInput, { target: { value: '2026-05-15T12:00' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Submission end date must be strictly after the submission start date/i)
        ).toBeTruthy();
      });
    });

    it('should REJECT when submissionStart is missing', async () => {
      apiClient.get.mockResolvedValueOnce({ data: mockPhases });
      render(<PhaseSchedulingPage />);

      fireEvent.change(await screen.findByLabelText(/^Phase$/i), {
        target: { value: 'boundary-phase-1h-window' },
      });

      await waitFor(() => {
        expect(screen.getByText(/Current Schedule/i)).toBeTruthy();
      });

      const endInput = screen.getByLabelText(/Submission End/i);
      const submitButton = screen.getByRole('button', { name: /Update Phase Schedule/i });

      // Leave startInput empty, set endInput
      fireEvent.change(endInput, { target: { value: '2026-05-15T13:00' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Submission start is required/i)).toBeTruthy();
      });
    });

    it('should REJECT when submissionEnd is missing', async () => {
      apiClient.get.mockResolvedValueOnce({ data: mockPhases });
      render(<PhaseSchedulingPage />);

      fireEvent.change(await screen.findByLabelText(/^Phase$/i), {
        target: { value: 'boundary-phase-1h-window' },
      });

      await waitFor(() => {
        expect(screen.getByText(/Current Schedule/i)).toBeTruthy();
      });

      const startInput = screen.getByLabelText(/Submission Start/i);
      const submitButton = screen.getByRole('button', { name: /Update Phase Schedule/i });

      // Set startInput, leave endInput empty
      fireEvent.change(startInput, { target: { value: '2026-05-15T12:00' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Submission end is required/i)).toBeTruthy();
      });
    });

    it('should reject invalid date format in startDate input', async () => {
      apiClient.get.mockResolvedValueOnce({ data: mockPhases });
      render(<PhaseSchedulingPage />);

      fireEvent.change(await screen.findByLabelText(/^Phase$/i), {
        target: { value: 'boundary-phase-1h-window' },
      });

      await waitFor(() => {
        expect(screen.getByText(/Current Schedule/i)).toBeTruthy();
      });

      const startInput = screen.getByLabelText(/Submission Start/i);
      const endInput = screen.getByLabelText(/Submission End/i);
      const submitButton = screen.getByRole('button', { name: /Update Phase Schedule/i });

      // Set invalid format
      fireEvent.change(startInput, { target: { value: 'not-a-date' } });
      fireEvent.change(endInput, { target: { value: '2026-05-15T13:00' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid submission start date/i)).toBeTruthy();
      });
    });
  });

  /**
   * 🌍 TIMEZONE CONSISTENCY TESTS
   */
  describe('🌍 Timezone: UTC Display & Enforcement', () => {
    it('should display dates in UTC format with timezone indicator', async () => {
      apiClient.get.mockResolvedValueOnce({ data: mockPhases });
      render(<PhaseSchedulingPage />);

      fireEvent.change(await screen.findByLabelText(/^Phase$/i), {
        target: { value: 'boundary-phase-1h-window' },
      });

      await waitFor(() => {
        expect(screen.getByText(/Current Schedule/i)).toBeTruthy();
      });

      // Look for UTC time display
      const utcIndicators = screen.getAllByText(/UTC time:/i);
      expect(utcIndicators.length).toBeGreaterThanOrEqual(2); // Start and End
    });

    it('should preserve ISO 8601 format when submitting dates to backend', async () => {
      apiClient.get.mockResolvedValueOnce({ data: mockPhases });
      apiClient.put.mockResolvedValueOnce({
        data: {
          phaseId: 'boundary-phase-1h-window',
          submissionStart: '2026-05-15T12:00:00.000Z',
          submissionEnd: '2026-05-15T13:00:00.000Z',
        },
      });

      render(<PhaseSchedulingPage />);

      fireEvent.change(await screen.findByLabelText(/^Phase$/i), {
        target: { value: 'boundary-phase-1h-window' },
      });

      await waitFor(() => {
        expect(screen.getByText(/Current Schedule/i)).toBeTruthy();
      });

      const startInput = screen.getByLabelText(/Submission Start/i);
      const endInput = screen.getByLabelText(/Submission End/i);
      const submitButton = screen.getByRole('button', { name: /Update Phase Schedule/i });

      fireEvent.change(startInput, { target: { value: '2026-05-15T12:00' } });
      fireEvent.change(endInput, { target: { value: '2026-05-15T13:00' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(apiClient.put).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            submissionStart: expect.stringMatching(/Z$/), // Ends with Z (UTC)
            submissionEnd: expect.stringMatching(/Z$/),
          })
        );
      });
    });
  });

  /**
   * 📅 DATE RANGE & EDGE CASES
   */
  describe('📅 Date Range & Edge Cases', () => {
    it('should support very large date ranges (years apart)', async () => {
      apiClient.get.mockResolvedValueOnce({ data: mockPhases });
      render(<PhaseSchedulingPage />);

      fireEvent.change(await screen.findByLabelText(/^Phase$/i), {
        target: { value: 'boundary-phase-1h-window' },
      });

      await waitFor(() => {
        expect(screen.getByText(/Current Schedule/i)).toBeTruthy();
      });

      const startInput = screen.getByLabelText(/Submission Start/i);
      const endInput = screen.getByLabelText(/Submission End/i);
      const submitButton = screen.getByRole('button', { name: /Update Phase Schedule/i });

      // Set dates 1 year apart
      fireEvent.change(startInput, { target: { value: '2026-01-01T00:00' } });
      fireEvent.change(endInput, { target: { value: '2027-01-01T00:00' } });
      fireEvent.click(submitButton);

      // Should not show validation error (valid range)
      await waitFor(() => {
        expect(submitButton.disabled).toBe(true); // Likely disabled during API call
      });
    });

    it('should allow schedules that cross midnight', async () => {
      apiClient.get.mockResolvedValueOnce({ data: mockPhases });
      render(<PhaseSchedulingPage />);

      fireEvent.change(await screen.findByLabelText(/^Phase$/i), {
        target: { value: 'boundary-phase-1h-window' },
      });

      await waitFor(() => {
        expect(screen.getByText(/Current Schedule/i)).toBeTruthy();
      });

      const startInput = screen.getByLabelText(/Submission Start/i);
      const endInput = screen.getByLabelText(/Submission End/i);
      const submitButton = screen.getByRole('button', { name: /Update Phase Schedule/i });

      // Cross midnight
      fireEvent.change(startInput, { target: { value: '2026-05-15T23:00' } });
      fireEvent.change(endInput, { target: { value: '2026-05-16T01:00' } });

      // Should be valid (end is after start)
      expect(submitButton.disabled).toBe(false);
    });

    it('should handle leap year date (Feb 29)', async () => {
      apiClient.get.mockResolvedValueOnce({ data: mockPhases });
      render(<PhaseSchedulingPage />);

      fireEvent.change(await screen.findByLabelText(/^Phase$/i), {
        target: { value: 'boundary-phase-1h-window' },
      });

      await waitFor(() => {
        expect(screen.getByText(/Current Schedule/i)).toBeTruthy();
      });

      const startInput = screen.getByLabelText(/Submission Start/i);
      const endInput = screen.getByLabelText(/Submission End/i);
      const submitButton = screen.getByRole('button', { name: /Update Phase Schedule/i });

      // 2024 is a leap year
      fireEvent.change(startInput, { target: { value: '2024-02-29T12:00' } });
      fireEvent.change(endInput, { target: { value: '2024-02-29T13:00' } });

      // Should be valid
      expect(submitButton.disabled).toBe(false);
    });
  });

  /**
   * 🔒 SECURITY & UX CONSISTENCY
   */
  describe('🔒 Security & UX Consistency', () => {
    it('should disable phase selection during API request', async () => {
      let resolveUpdate;
      const updatePromise = new Promise((resolve) => {
        resolveUpdate = resolve;
      });

      apiClient.get.mockResolvedValueOnce({ data: mockPhases });
      apiClient.put.mockReturnValueOnce(updatePromise);

      render(<PhaseSchedulingPage />);

      const phaseSelect = await screen.findByLabelText(/^Phase$/i);
      fireEvent.change(phaseSelect, { target: { value: 'boundary-phase-1h-window' } });

      await waitFor(() => {
        expect(screen.getByText(/Current Schedule/i)).toBeTruthy();
      });

      fireEvent.change(screen.getByLabelText(/Submission Start/i), {
        target: { value: '2026-05-16T12:00' },
      });
      fireEvent.change(screen.getByLabelText(/Submission End/i), {
        target: { value: '2026-05-16T13:00' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Update Phase Schedule/i }));

      // Phase select should be disabled during request
      await waitFor(() => {
        expect(phaseSelect.disabled).toBe(true);
      });

      // Resolve the promise
      resolveUpdate({ data: mockPhases[0] });
    });

    it('should preserve form state during failed API calls', async () => {
      apiClient.get.mockResolvedValueOnce({ data: mockPhases });
      apiClient.put.mockRejectedValueOnce({
        response: {
          data: {
            message: ['Invalid date format'],
          },
        },
      });

      render(<PhaseSchedulingPage />);

      fireEvent.change(await screen.findByLabelText(/^Phase$/i), {
        target: { value: 'boundary-phase-1h-window' },
      });

      await waitFor(() => {
        expect(screen.getByText(/Current Schedule/i)).toBeTruthy();
      });

      const startInput = screen.getByLabelText(/Submission Start/i);
      const endInput = screen.getByLabelText(/Submission End/i);

      fireEvent.change(startInput, { target: { value: '2026-05-16T12:00' } });
      fireEvent.change(endInput, { target: { value: '2026-05-16T13:00' } });

      const submitButton = screen.getByRole('button', { name: /Update Phase Schedule/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Form values should be preserved after error
        expect(startInput.value).toBe('2026-05-16T12:00');
        expect(endInput.value).toBe('2026-05-16T13:00');
      });
    });
  });
});
