import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import StudentSubmissionPage from './StudentSubmissionPage';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';

vi.mock('../utils/apiClient');

const activePhase = {
  phaseId: 'phase-1',
  submissionStart: '2026-01-01T00:00:00.000Z',
  submissionEnd: '2099-01-01T00:00:00.000Z',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/student-submissions']}>
      <Routes>
        <Route path="/student-submissions" element={<StudentSubmissionPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

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

  it('loads student submissions, selects one, and uploads using its id', async () => {
    apiClient.get.mockImplementation(async (endpoint) => {
      // Must mock auth.me since the component now requires a groupId to submit
      if (endpoint === apiConfig.endpoints.auth.me) {
        return { data: { groupId: 'group-1', role: 'Student' } };
      }
      if (endpoint === apiConfig.endpoints.submissions.mine) {
        return {
          data: [{ _id: 'sub-1', title: 'Proposal', submittedAt: '2026-05-01T00:00:00.000Z', status: 'Pending' }],
        };
      }
      if (endpoint === apiConfig.endpoints.phaseById('phase-1')) {
        return { data: activePhase };
      }
      return { data: {} };
    });
    apiClient.post.mockResolvedValueOnce({ data: { document: { originalName: 'proposal.pdf' } } });

    renderPage();

    // Wait for auth validation to pass so the submit button isn't disabled by membership rules
    await waitFor(() => {
      expect(screen.getByDisplayValue('group-1')).toBeTruthy();
    });

    fireEvent.change(await screen.findByLabelText(/Submission ID/i), {
      target: { value: 'sub-1' },
    });
    fireEvent.change(screen.getByLabelText(/Phase ID/i), {
      target: { value: 'phase-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Load Window Status/i }));

    await screen.findByText(/Phase schedule loaded successfully/i);

    const file = new File(['content'], 'proposal.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText(/Document/i), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole('button', { name: /Submit Document/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        apiConfig.endpoints.submissionDocuments('sub-1'),
        expect.any(FormData),
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
    });
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