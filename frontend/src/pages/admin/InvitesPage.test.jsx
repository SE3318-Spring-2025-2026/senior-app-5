import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import InvitesPage from './InvitesPage'
import apiClient from '../../utils/apiClient'
import apiConfig from '../../config/api'

vi.mock('../../utils/apiClient')
vi.mock('../../context/AdminGroupContext', () => ({
  useAdminGroup: () => ({ currentGroupId: 'group-1' }),
}))

describe('InvitesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('selects invite recipient by email search and submits selected id', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: [{ _id: 'user-1', email: 'student@example.edu' }],
    })
    apiClient.post.mockResolvedValueOnce({ data: { notificationId: 'notif-1' } })

    render(<InvitesPage />)

    fireEvent.change(screen.getByPlaceholderText(/Search recipient by email/i), {
      target: { value: 'student' },
    })

    fireEvent.click(await screen.findByText('student@example.edu'))
    fireEvent.click(screen.getByRole('button', { name: /Deliver Invite/i }))

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(apiConfig.endpoints.userSearch, {
        params: { field: 'email', value: 'student' },
      })
      expect(apiClient.post).toHaveBeenCalledWith(apiConfig.endpoints.invites, {
        groupId: 'group-1',
        recipientUserId: 'user-1',
      })
    })
  })
})
