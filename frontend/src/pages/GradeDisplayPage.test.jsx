import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GradeDisplayPage from './GradeDisplayPage';
import apiClient from '../utils/apiClient';

vi.mock('../utils/apiClient');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <GradeDisplayPage />
    </MemoryRouter>,
  );

describe('GradeDisplayPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ── Student view ────────────────────────────────────────────────────────────

  it('StudentFinalGrade view hides team data for STUDENT role', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'student-uuid-1', role: 'Student' }),
    );
    apiClient.get.mockResolvedValueOnce({
      data: {
        studentId: 'student-uuid-1',
        groupId: 'group-uuid-1',
        individualAllowanceRatio: 0.9,
        finalGrade: 70.56,
        calculatedAt: '2026-05-01T10:00:00.000Z',
      },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('70.56')).toBeTruthy();
      expect(screen.getByText('90%')).toBeTruthy();
    });

    // Team grade heading must not be present in student view
    expect(screen.queryByText(/Team Grade/i)).toBeNull();
    // Grade history section must not be present
    expect(screen.queryByText(/Grade History/i)).toBeNull();
  });

  it('404 renders empty state for STUDENT (not error page)', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'student-uuid-1', role: 'Student' }),
    );
    apiClient.get.mockRejectedValueOnce({ response: { status: 404 } });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/No grade available yet/i)).toBeTruthy();
    });

    // Must not throw to an error page
    expect(screen.queryByText(/error/i)).toBeNull();
  });

  it('403 for STUDENT shows correct permission message', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'student-uuid-1', role: 'Student' }),
    );
    apiClient.get.mockRejectedValueOnce({ response: { status: 403 } });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/You are not allowed to view this grade/i)).toBeTruthy();
    });
  });

  // ── Staff view — GroupFinalGrade ────────────────────────────────────────────

  it('GroupFinalGrade renders all individualGrades rows correctly', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'coord-uuid-1', role: 'Coordinator' }),
    );

    const groupGradeResponse = {
      groupId: 'group-uuid-1',
      teamGrade: 78.4,
      calculatedAt: '2026-05-01T10:00:00.000Z',
      individualGrades: [
        {
          studentId: 'stu-1',
          groupId: 'group-uuid-1',
          individualAllowanceRatio: 1.0,
          finalGrade: 78.4,
          calculatedAt: '2026-05-01T10:00:00.000Z',
        },
        {
          studentId: 'stu-2',
          groupId: 'group-uuid-1',
          individualAllowanceRatio: 0.8,
          finalGrade: 62.72,
          calculatedAt: '2026-05-01T10:00:00.000Z',
        },
      ],
    };

    const historyResponse = {
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    };

    apiClient.get
      .mockResolvedValueOnce({ data: groupGradeResponse })
      .mockResolvedValueOnce({ data: historyResponse });

    renderPage();

    const input = screen.getByPlaceholderText(/Enter Group ID/i);
    fireEvent.change(input, { target: { value: 'group-uuid-1' } });
    fireEvent.submit(input.closest('form'));

    await waitFor(() => {
      expect(screen.getByText('stu-1')).toBeTruthy();
      expect(screen.getByText('stu-2')).toBeTruthy();
      // 78.40 appears in both the heading span and the table cell
      expect(screen.getAllByText('78.40').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('62.72')).toBeTruthy();
    });
  });

  it('404 renders empty state for group grade (not error page)', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'coord-uuid-1', role: 'Coordinator' }),
    );
    apiClient.get.mockRejectedValueOnce({ response: { status: 404 } });

    renderPage();

    const input = screen.getByPlaceholderText(/Enter Group ID/i);
    fireEvent.change(input, { target: { value: 'group-uuid-1' } });
    fireEvent.submit(input.closest('form'));

    await waitFor(() => {
      expect(screen.getByText(/No grade available yet for this group/i)).toBeTruthy();
    });
  });

  // ── Grade history ───────────────────────────────────────────────────────────

  it('Grade history table paginates correctly', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'coord-uuid-1', role: 'Coordinator' }),
    );

    const makeHistoryPage = (page) => ({
      data: [
        {
          gradeChangeId: `change-${page}`,
          groupId: 'group-uuid-1',
          teamGrade: 78.0 + page,
          gradeComponents: { d4: 80, sprintAvg: 70 },
          triggeredBy: 'coord-uuid-1',
          changedAt: '2026-05-01T10:00:00.000Z',
        },
      ],
      total: 40,
      page,
      limit: 20,
    });

    const groupGradeResponse = {
      groupId: 'group-uuid-1',
      teamGrade: 78.4,
      calculatedAt: '2026-05-01T10:00:00.000Z',
      individualGrades: [],
    };

    // First load: group grade + history page 1
    apiClient.get
      .mockResolvedValueOnce({ data: groupGradeResponse })
      .mockResolvedValueOnce({ data: makeHistoryPage(1) });

    renderPage();

    const input = screen.getByPlaceholderText(/Enter Group ID/i);
    fireEvent.change(input, { target: { value: 'group-uuid-1' } });
    fireEvent.submit(input.closest('form'));

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 2/i)).toBeTruthy();
    });

    // Simulate clicking Next
    apiClient.get.mockResolvedValueOnce({ data: makeHistoryPage(2) });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText(/Page 2 of 2/i)).toBeTruthy();
    });
  });

  it('History table hidden for non-COORDINATOR/ADMIN (Professor role)', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'prof-uuid-1', role: 'Professor' }),
    );

    const groupGradeResponse = {
      groupId: 'group-uuid-1',
      teamGrade: 78.4,
      calculatedAt: '2026-05-01T10:00:00.000Z',
      individualGrades: [],
    };

    apiClient.get.mockResolvedValueOnce({ data: groupGradeResponse });

    renderPage();

    const input = screen.getByPlaceholderText(/Enter Group ID/i);
    fireEvent.change(input, { target: { value: 'group-uuid-1' } });
    fireEvent.submit(input.closest('form'));

    await waitFor(() => {
      expect(screen.getByText(/Team Grade/i)).toBeTruthy();
    });

    expect(screen.queryByText(/Grade History/i)).toBeNull();
    // History API should NOT have been called
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });

  it('redirects to login when user is not in localStorage', () => {
    renderPage();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
