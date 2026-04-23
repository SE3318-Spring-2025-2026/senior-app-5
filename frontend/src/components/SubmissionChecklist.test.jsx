import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SubmissionChecklist from './SubmissionChecklist';
import apiClient from '../utils/apiClient';

vi.mock('../utils/apiClient');

describe('SubmissionChecklist Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should display error if user session is missing', async () => {
    render(<SubmissionChecklist />);
    await waitFor(() => {
      expect(screen.getByText('User session not found.')).toBeTruthy();
    });
  });

  it('should display error if user is not assigned to a group', async () => {
    localStorage.setItem('user', JSON.stringify({ role: 'Student' })); 
    render(<SubmissionChecklist />);
    await waitFor(() => {
      expect(screen.getByText('You are not assigned to any group yet.')).toBeTruthy();
    });
  });

  it('should display error if there are no active submissions', async () => {
    localStorage.setItem('user', JSON.stringify({ role: 'Student', groupId: 'group1' }));
    apiClient.get.mockResolvedValueOnce({ data: [] }); 
    render(<SubmissionChecklist />);
    await waitFor(() => {
      expect(screen.getByText('No active submissions found to track.')).toBeTruthy();
    });
  });

  it('should render requirements correctly based on real API structure', async () => {
    localStorage.setItem('user', JSON.stringify({ role: 'Student', groupId: 'group1' }));

    apiClient.get.mockResolvedValueOnce({
      data: [{ _id: 'sub123' }]
    });

    apiClient.get.mockResolvedValueOnce({
      data: {
        submissionId: "123",
        isComplete: false,
        missingFields: ["documents"],
        requiredFields: ["title", "documents"],
        phaseId: "phase-1"
      }
    });

    render(<SubmissionChecklist />);

    await waitFor(() => {

      expect(screen.getByText('Title')).toBeTruthy();

      expect(screen.getByText('Documents')).toBeTruthy();
      
      expect(screen.getByText('COMPLETE')).toBeTruthy();
      expect(screen.getByText('PENDING')).toBeTruthy();
    });
  });
});