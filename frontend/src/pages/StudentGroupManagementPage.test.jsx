import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import StudentGroupManagementPage from './StudentGroupManagementPage'
import apiClient from '../utils/apiClient'
import apiConfig from '../config/api'

vi.mock('../utils/apiClient')

describe('StudentGroupManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('uses group id from session for advisor request without rendering a manual group input', async () => {
    localStorage.setItem('user', JSON.stringify({ role: 'TeamLeader', teamId: 'group-1' }))
    apiClient.get.mockResolvedValueOnce({
      data: [{ advisorId: 'advisor-1', name: 'Advisor One' }],
    })
    apiClient.post.mockResolvedValueOnce({})

    render(<StudentGroupManagementPage />)

    expect(screen.queryByLabelText(/^Group ID$/i)).toBeNull()
    expect(screen.getByText('group-1')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Load Advisors/i }))
    fireEvent.click(await screen.findByLabelText(/Advisor One/i))
    fireEvent.click(screen.getByRole('button', { name: /Submit Request/i }))

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(apiConfig.endpoints.requests, {
        groupId: 'group-1',
        advisorId: 'advisor-1',
      })
    })
  })
})
