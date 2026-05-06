import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import StudentSubmissionPage from './StudentSubmissionPage'
import apiClient from '../utils/apiClient'
import apiConfig from '../config/api'

vi.mock('../utils/apiClient')

const activePhase = {
  phaseId: 'phase-1',
  submissionStart: '2026-01-01T00:00:00.000Z',
  submissionEnd: '2099-01-01T00:00:00.000Z',
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/student-submissions']}>
      <Routes>
        <Route path="/student-submissions" element={<StudentSubmissionPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('StudentSubmissionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads student submissions, selects one, and uploads using its id', async () => {
    apiClient.get.mockImplementation((endpoint) => {
      if (endpoint === apiConfig.endpoints.submissions.mine) {
        return Promise.resolve({
          data: [{ _id: 'sub-1', title: 'Proposal', submittedAt: '2026-05-01T00:00:00.000Z', status: 'Pending' }],
        })
      }
      if (endpoint === apiConfig.endpoints.phaseById('phase-1')) {
        return Promise.resolve({ data: activePhase })
      }
      return Promise.resolve({ data: {} })
    })
    apiClient.post.mockResolvedValueOnce({ data: { document: { originalName: 'proposal.pdf' } } })

    renderPage()

    fireEvent.change(await screen.findByLabelText(/Submission ID/i), {
      target: { value: 'sub-1' },
    })
    fireEvent.change(screen.getByLabelText(/Phase ID/i), {
      target: { value: 'phase-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Load Window Status/i }))

    await screen.findByText(/Phase schedule loaded successfully/i)

    const file = new File(['content'], 'proposal.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByLabelText(/Document/i), {
      target: { files: [file] },
    })
    fireEvent.click(screen.getByRole('button', { name: /Submit Document/i }))

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        apiConfig.endpoints.submissionDocuments('sub-1'),
        expect.any(FormData),
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
    })
  })
})
