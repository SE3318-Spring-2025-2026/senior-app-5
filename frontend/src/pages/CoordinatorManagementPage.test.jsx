import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CoordinatorManagementPage from './CoordinatorManagementPage'
import apiClient from '../utils/apiClient'
import apiConfig from '../config/api'
import { addJuryMember } from '../utils/committeeService'

vi.mock('../utils/apiClient')
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'Coordinator' } }),
}))
vi.mock('../components/CreateCoordinatorForm', () => ({
  CreateCoordinatorForm: () => <div>Create coordinator form</div>,
}))
vi.mock('../utils/scheduleService', () => ({
  createSchedule: vi.fn(),
  getActiveSchedule: vi.fn().mockResolvedValue(null),
}))
vi.mock('../utils/committeeService', () => ({
  addAdvisor: vi.fn(),
  addJuryMember: vi.fn().mockResolvedValue({}),
  assignCommitteeGroup: vi.fn(),
  createCommittee: vi.fn(),
  deleteCommittee: vi.fn(),
  getCommittee: vi.fn().mockResolvedValue({ id: 'committee-1', name: 'AI Committee' }),
  listAdvisors: vi.fn().mockResolvedValue([]),
  listCommitteeGroups: vi.fn().mockResolvedValue([]),
  listCommittees: vi.fn().mockResolvedValue({ data: [] }),
  listJuryMembers: vi.fn().mockResolvedValue([]),
  removeAdvisor: vi.fn(),
  removeCommitteeGroup: vi.fn(),
  removeJuryMember: vi.fn(),
  updateCommittee: vi.fn(),
}))

describe('CoordinatorManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('selects committee by name and jury user by email before adding relation', async () => {
    apiClient.get.mockImplementation((endpoint, config) => {
      if (endpoint === apiConfig.endpoints.committees) {
        expect(config.params).toEqual({ page: 1, limit: 10, name: 'AI' })
        return Promise.resolve({ data: { data: [{ id: 'committee-1', name: 'AI Committee' }] } })
      }
      if (endpoint === apiConfig.endpoints.userSearch) {
        expect(config.params).toEqual({ field: 'email', value: 'prof' })
        return Promise.resolve({ data: [{ _id: 'prof-1', email: 'prof@example.edu' }] })
      }
      return Promise.resolve({ data: [] })
    })

    render(<CoordinatorManagementPage />)

    const committeeSearchInputs = screen.getAllByPlaceholderText(/Search committee by name/i)
    fireEvent.change(committeeSearchInputs[1], {
      target: { value: 'AI' },
    })
    fireEvent.click(await screen.findByText('AI Committee'))

    fireEvent.change(screen.getByPlaceholderText(/Search jury user by email/i), {
      target: { value: 'prof' },
    })
    fireEvent.click(await screen.findByText('prof@example.edu'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add \/ Assign/i }).disabled).toBe(false)
    })
    fireEvent.click(screen.getByRole('button', { name: /Add \/ Assign/i }))

    await waitFor(() => {
      expect(addJuryMember).toHaveBeenCalledWith('committee-1', 'prof-1')
    })
  })
})
