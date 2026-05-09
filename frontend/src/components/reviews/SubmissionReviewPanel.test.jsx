import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SubmissionReviewPanel from './SubmissionReviewPanel'
import { createReview, getReview } from '../../utils/reviewService'
import { getGradingWindow } from '../../utils/scheduleService'

vi.mock('../../utils/reviewService', () => ({
  addComment: vi.fn(),
  createReview: vi.fn(),
  deleteComment: vi.fn(),
  getReview: vi.fn(),
  requestRevision: vi.fn(),
  submitGrade: vi.fn(),
}))

vi.mock('../../utils/scheduleService', () => ({
  getGradingWindow: vi.fn(),
}))

const submission = {
  _id: 'submission-1',
  documents: [],
  status: 'UnderReview',
  title: 'Proposal',
  type: 'INITIAL',
}

describe('SubmissionReviewPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getGradingWindow.mockResolvedValue({ isOpen: false })
    createReview.mockResolvedValue({
      _id: 'review-1',
      comments: [
        { _id: 'comment-1', authorUserId: 'prof-1', text: 'My comment' },
        { _id: 'comment-2', authorUserId: 'prof-2', text: 'Other comment' },
      ],
      revisionRequests: [],
      status: 'UnderReview',
    })
    getReview.mockResolvedValue({
      _id: 'review-1',
      comments: [],
      revisionRequests: [],
      status: 'UnderReview',
    })
  })

  it('disables the grade input when the grading window is closed', async () => {
    render(
      <SubmissionReviewPanel
        committeeId="committee-1"
        currentUser={{ userId: 'prof-1' }}
        submission={submission}
      />,
    )

    const gradeInput = await screen.findByLabelText('Grade')

    await waitFor(() => {
      expect(gradeInput.disabled).toBe(true)
      expect(gradeInput.title).toBe('Grading window is currently closed')
    })
  })

  it('renders delete only for the authenticated user own comments', async () => {
    render(
      <SubmissionReviewPanel
        committeeId="committee-1"
        currentUser={{ userId: 'prof-1' }}
        submission={submission}
      />,
    )

    expect(await screen.findByText('My comment')).toBeTruthy()
    expect(screen.getByText('Other comment')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /delete/i })).toHaveLength(1)
  })

  it('reuses cached review id when submission is selected again', async () => {
    createReview
      .mockResolvedValueOnce({
        _id: 'review-1',
        comments: [],
        revisionRequests: [],
        status: 'UnderReview',
      })
      .mockResolvedValueOnce({
        _id: 'review-2',
        comments: [],
        revisionRequests: [],
        status: 'UnderReview',
      })

    const { rerender } = render(
      <SubmissionReviewPanel
        committeeId="committee-1"
        currentUser={{ userId: 'prof-1' }}
        submission={submission}
      />,
    )

    await screen.findByText('No comments yet.')
    expect(createReview).toHaveBeenCalledTimes(1)

    rerender(
      <SubmissionReviewPanel
        committeeId="committee-1"
        currentUser={{ userId: 'prof-1' }}
        submission={{ ...submission, _id: 'submission-2' }}
      />,
    )
    await waitFor(() => {
      expect(createReview).toHaveBeenCalledTimes(2)
    })

    rerender(
      <SubmissionReviewPanel
        committeeId="committee-1"
        currentUser={{ userId: 'prof-1' }}
        submission={submission}
      />,
    )

    await waitFor(() => {
      expect(getReview).toHaveBeenCalledWith('review-1')
      expect(createReview).toHaveBeenCalledTimes(2)
    })
  })
})
