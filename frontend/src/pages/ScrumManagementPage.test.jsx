import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ScrumManagementPage from './ScrumManagementPage';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';

vi.mock('../utils/apiClient');

const TEAM_ID = 'team-sync-test-1';

function setupUser(payload) {
  localStorage.setItem('user', JSON.stringify(payload));
}

function renderPage() {
  return render(
    <BrowserRouter>
      <ScrumManagementPage />
    </BrowserRouter>,
  );
}

describe('ScrumManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    apiClient.get.mockReset();
    apiClient.post.mockReset();
  });

  it('shows unauthorized message for Student and does not fetch team APIs', async () => {
    setupUser({ role: 'Student', teamId: TEAM_ID });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/not authorized to view Scrum Management/i)).toBeTruthy();
    });

    expect(apiClient.get).not.toHaveBeenCalled();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('loads team leader data and shows integration, sync summary, story points, and issue rows', async () => {
    setupUser({ role: 'TeamLeader', teamId: TEAM_ID });

    apiClient.get.mockImplementation((path) => {
      if (path === `/teams/${TEAM_ID}`) {
        return Promise.resolve({
          data: {
            jiraProjectKey: 'MYPROJ',
            jiraDomain: 'company.atlassian.net',
            githubRepositoryId: 'gh-99',
          },
        });
      }
      if (path === apiConfig.endpoints.teamSync(TEAM_ID)) {
        return Promise.resolve({
          data: {
            syncRunId: 'run-1',
            totalIssues: 2,
            linkedCount: 2,
            syncedAt: '2026-05-07T12:00:00.000Z',
            issues: [
              {
                issueKey: 'MYPROJ-1',
                summary: 'Feature A',
                status: 'Done',
                githubBranchFound: true,
                githubPrFound: true,
              },
              {
                issueKey: 'MYPROJ-2',
                summary: 'Feature B',
                status: 'Open',
                githubBranchFound: false,
                githubPrFound: false,
              },
            ],
          },
        });
      }
      if (path === apiConfig.endpoints.teamStoryPoints(TEAM_ID)) {
        return Promise.resolve({
          data: { completedStoryPoints: 3, totalStoryPoints: 8 },
        });
      }
      return Promise.reject(new Error(`unexpected GET ${path}`));
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('MYPROJ')).toBeTruthy();
    });

    expect(screen.getByText('company.atlassian.net')).toBeTruthy();
    expect(screen.getByText('gh-99')).toBeTruthy();
    expect(screen.getByText(/3 \/ 8 story points completed/i)).toBeTruthy();

    expect(screen.getByText('MYPROJ-1')).toBeTruthy();
    expect(screen.getByText('Feature A')).toBeTruthy();
    const brokenRow = screen.getByText('MYPROJ-2').closest('tr');
    expect(brokenRow).toBeTruthy();
    expect(brokenRow.className).toMatch(/bg-amber-500/);

    expect(apiClient.get).toHaveBeenCalledWith(`/teams/${TEAM_ID}`);
    expect(apiClient.get).toHaveBeenCalledWith(apiConfig.endpoints.teamSync(TEAM_ID));
    expect(apiClient.get).toHaveBeenCalledWith(apiConfig.endpoints.teamStoryPoints(TEAM_ID));
  });

  it('calls POST sync when Team Leader clicks Sync Stories', async () => {
    setupUser({ role: 'TeamLeader', teamId: TEAM_ID });

    apiClient.get.mockImplementation((path) => {
      if (path === `/teams/${TEAM_ID}`) {
        return Promise.resolve({ data: {} });
      }
      if (path === apiConfig.endpoints.teamSync(TEAM_ID)) {
        return Promise.resolve({
          data: {
            syncRunId: 'run-1',
            totalIssues: 1,
            linkedCount: 1,
            syncedAt: null,
            issues: [],
          },
        });
      }
      if (path === apiConfig.endpoints.teamStoryPoints(TEAM_ID)) {
        return Promise.resolve({ data: { completedStoryPoints: 0, totalStoryPoints: 1 } });
      }
      return Promise.reject(new Error(`unexpected GET ${path}`));
    });

    apiClient.post.mockResolvedValue({
      data: {
        syncRunId: 'run-2',
        totalIssues: 4,
        linkedCount: 2,
        syncedAt: '2026-05-07T14:00:00.000Z',
      },
    });

    renderPage();

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /sync stories/i });
      expect(btn.disabled).toBe(false);
    });

    fireEvent.click(screen.getByRole('button', { name: /sync stories/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(apiConfig.endpoints.teamSync(TEAM_ID));
    });

    expect(apiClient.get.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('disables sync for Coordinator and shows read-only copy', async () => {
    setupUser({ role: 'Coordinator', teamId: TEAM_ID });

    apiClient.get.mockImplementation((path) => {
      if (path === `/teams/${TEAM_ID}`) {
        return Promise.resolve({ data: { jiraProjectKey: 'X' } });
      }
      if (path === apiConfig.endpoints.teamSync(TEAM_ID)) {
        return Promise.resolve({ data: { totalIssues: 0, issues: [] } });
      }
      if (path === apiConfig.endpoints.teamStoryPoints(TEAM_ID)) {
        return Promise.resolve({ data: { completedStoryPoints: 0, totalStoryPoints: 0 } });
      }
      return Promise.reject(new Error(`unexpected GET ${path}`));
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/read-only access for coordinators/i)).toBeTruthy();
    });

    expect(screen.getByRole('button', { name: /sync stories/i }).disabled).toBe(true);
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('shows credentials guidance when sync GET returns 400', async () => {
    setupUser({ role: 'TeamLeader', teamId: TEAM_ID });

    apiClient.get.mockImplementation((path) => {
      if (path === `/teams/${TEAM_ID}`) {
        return Promise.resolve({ data: {} });
      }
      if (path === apiConfig.endpoints.teamSync(TEAM_ID)) {
        const err = new Error('Bad Request');
        err.response = { status: 400, data: { message: 'Credentials missing' } };
        return Promise.reject(err);
      }
      if (path === apiConfig.endpoints.teamStoryPoints(TEAM_ID)) {
        return Promise.resolve({ data: {} });
      }
      return Promise.reject(new Error(`unexpected GET ${path}`));
    });

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText(/JIRA\/GitHub credentials are not configured for this team/i),
      ).toBeTruthy();
    });
  });
});
