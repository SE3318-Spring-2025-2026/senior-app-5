import { beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from './apiClient'
import {
  addComment,
  createReview,
  deleteComment,
  getReview,
  getSubmissionsForCommittee,
  requestRevision,
  submitGrade,
} from './reviewService'

vi.mock('./apiClient', () => ({
  default: {
    delete: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('reviewService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiClient.get.mockResolvedValue({ data: {} })
    apiClient.post.mockResolvedValue({ data: {} })
    apiClient.delete.mockResolvedValue({ data: {} })
  })

  it('creates a review with submissionId and committeeId', async () => {
    await createReview('submission-1', 'committee-1')

    expect(apiClient.post).toHaveBeenCalledWith('/reviews', {
      submissionId: 'submission-1',
      committeeId: 'committee-1',
    })
  })

  it('gets a review by id', async () => {
    await getReview('review-1')

    expect(apiClient.get).toHaveBeenCalledWith('/reviews/review-1')
  })

  it('adds a comment', async () => {
    await addComment('review-1', 'Looks good')

    expect(apiClient.post).toHaveBeenCalledWith('/reviews/review-1/comments', {
      text: 'Looks good',
    })
  })

  it('deletes a comment', async () => {
    await deleteComment('review-1', 'comment-1')

    expect(apiClient.delete).toHaveBeenCalledWith('/reviews/review-1/comments/comment-1')
  })

  it('requests a revision', async () => {
    await requestRevision('review-1', 'Update references', '2026-05-10T10:00:00.000Z')

    expect(apiClient.post).toHaveBeenCalledWith('/reviews/review-1/revision-requests', {
      description: 'Update references',
      dueDatetime: '2026-05-10T10:00:00.000Z',
    })
  })

  it('submits a grade', async () => {
    await submitGrade('review-1', 92)

    expect(apiClient.post).toHaveBeenCalledWith('/reviews/review-1/grade', { grade: 92 })
  })

  it('gets submissions for a committee', async () => {
    await getSubmissionsForCommittee('committee-1')

    expect(apiClient.get).toHaveBeenCalledWith('/submissions?committeeId=committee-1')
  })
})
