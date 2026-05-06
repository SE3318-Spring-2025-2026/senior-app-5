import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StoryPointsPanel from './StoryPointsPanel';
import storyPointsService from '../../utils/storyPointsService';

vi.mock('../../utils/storyPointsService', () => ({
  default: {
    getStoryPoints: vi.fn(),
    fetchAndVerifyStoryPoints: vi.fn(),
    overrideStoryPoints: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('StoryPointsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders source badge with correct label', async () => {
    storyPointsService.getStoryPoints.mockResolvedValue({
      records: [
        {
          studentId: 'student-1',
          completedPoints: 8,
          targetPoints: 10,
          source: 'JIRA_GITHUB',
        },
      ],
    });

    render(<StoryPointsPanel canOverride={false} />);

    fireEvent.change(screen.getByPlaceholderText('Group UUID'), {
      target: { value: 'group-1' },
    });
    fireEvent.change(screen.getByPlaceholderText('Sprint UUID'), {
      target: { value: 'sprint-1' },
    });
    fireEvent.click(screen.getByText('Load'));

    await waitFor(() => {
      expect(screen.getByText('JIRA_GITHUB')).toBeTruthy();
    });
  });

  it('validates completedPoints >= 0 before override submit', async () => {
    storyPointsService.getStoryPoints.mockResolvedValue({
      records: [
        {
          studentId: 'student-2',
          completedPoints: 5,
          targetPoints: 10,
          source: 'MANUAL',
        },
      ],
    });

    render(<StoryPointsPanel canOverride />);

    fireEvent.change(screen.getByPlaceholderText('Group UUID'), {
      target: { value: 'group-1' },
    });
    fireEvent.change(screen.getByPlaceholderText('Sprint UUID'), {
      target: { value: 'sprint-1' },
    });
    fireEvent.click(screen.getByText('Load'));

    await screen.findByLabelText('override-student-2');
    fireEvent.change(screen.getByLabelText('override-student-2'), {
      target: { value: '-1' },
    });
    fireEvent.click(screen.getByText('Apply'));

    expect(storyPointsService.overrideStoryPoints).not.toHaveBeenCalled();
  });

  it('does not render override controls for advisor/professor view', async () => {
    storyPointsService.getStoryPoints.mockResolvedValue({
      records: [
        {
          studentId: 'student-3',
          completedPoints: 3,
          targetPoints: 10,
          source: 'MANUAL',
        },
      ],
    });

    render(<StoryPointsPanel canOverride={false} />);

    fireEvent.change(screen.getByPlaceholderText('Group UUID'), {
      target: { value: 'group-1' },
    });
    fireEvent.change(screen.getByPlaceholderText('Sprint UUID'), {
      target: { value: 'sprint-1' },
    });
    fireEvent.click(screen.getByText('Load'));

    await screen.findByText('student-3');
    expect(screen.queryByText('Apply')).toBeNull();
  });
});
