import { describe, it, expect, beforeEach, vi } from 'vitest';
import storyPointsService from './storyPointsService';
import apiClient from './apiClient';

vi.mock('./apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('storyPointsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls PATCH override endpoint with studentId in path', async () => {
    apiClient.patch.mockResolvedValue({
      data: { studentId: 'cccccccc-cccc-cccc-cccc-cccccccccccc', targetPoints: 12 },
    });

    await storyPointsService.overrideStoryPoints(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      12,
    );

    expect(apiClient.patch).toHaveBeenCalledWith(
      '/groups/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/sprints/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/story-points/cccccccc-cccc-cccc-cccc-cccccccccccc',
      { targetPoints: 12 },
    );
  });
});
