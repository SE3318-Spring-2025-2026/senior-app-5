import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import StudentSubmissionPage from './StudentSubmissionPage';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';

vi.mock('../utils/apiClient');

function renderWithRoute(initialPath) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/documents/upload" element={<StudentSubmissionPage />} />
        <Route path="/documents/:phaseId/:submissionId" element={<StudentSubmissionPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('StudentSubmissionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads membership and shows read-only group when user has groupId', async () => {
    const start = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const end = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    apiClient.get.mockImplementation(async (url) => {
      if (url === apiConfig.endpoints.auth.me) {
        return { data: { groupId: 'assigned-group-uuid', role: 'Student' } };
      }
      if (url === apiConfig.endpoints.phaseById('phase-open')) {
        return { data: { submissionStart: start, submissionEnd: end, phaseId: 'phase-open' } };
      }
      throw new Error(`Unexpected GET ${url}`);
    });

    renderWithRoute('/documents/phase-open/64f1a2b3c4d5e6f7a8b9c0d1');

    await waitFor(() => {
      expect(screen.getByDisplayValue('assigned-group-uuid')).toBeTruthy();
    });

    expect(
      screen.getByText(/Submitting on behalf of group: assigned-group-uuid/i),
    ).toBeTruthy();
    expect(apiClient.get).toHaveBeenCalledWith(apiConfig.endpoints.auth.me);
  });

  it('shows friendly error and keeps submit disabled when user has no group', async () => {
    apiClient.get.mockImplementation(async (url) => {
      if (url === apiConfig.endpoints.auth.me) {
        return { data: { groupId: null, teamId: null, role: 'Student' } };
      }
      if (url === apiConfig.endpoints.phaseById('phase-open')) {
        const start = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const end = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        return { data: { submissionStart: start, submissionEnd: end } };
      }
      throw new Error(`Unexpected GET ${url}`);
    });

    renderWithRoute('/documents/phase-open/64f1a2b3c4d5e6f7a8b9c0d1');

    await waitFor(() => {
      expect(
        screen.getByText(/not assigned to any group yet/i),
      ).toBeTruthy();
    });

    const submitBtn = screen.getByRole('button', { name: /submit document/i });
    expect(submitBtn).toBeDisabled();
  });
});