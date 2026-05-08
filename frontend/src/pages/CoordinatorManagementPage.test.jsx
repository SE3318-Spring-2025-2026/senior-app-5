import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CoordinatorManagementPage from './CoordinatorManagementPage'
import apiClient from '../utils/apiClient'
import apiConfig from '../config/api'
import { addJuryMember } from '../utils/committeeService'
import { createSchedule, getActiveSchedule } from '../utils/scheduleService'

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
  getCommittee: vi.fn().mockResolvedValue({ id: 'committee-1', name: 'AI Committee' }),
  listAdvisors: vi.fn().mockResolvedValue([]),
  listCommitteeGroups: vi.fn().mockResolvedValue([]),
  listJuryMembers: vi.fn().mockResolvedValue([]),
  removeAdvisor: vi.fn(),
  removeCommitteeGroup: vi.fn(),
  removeJuryMember: vi.fn(),
}))

describe('CoordinatorManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Schedule Creation Validation & Happy Path', () => {
    it('blocks schedule creation if phase is missing', async () => {
      render(<CoordinatorManagementPage />)
      
      const submitButton = screen.getByRole('button', { name: /Create Schedule/i })
      fireEvent.click(submitButton)

      expect(await screen.findByText('Phase is required.')).toBeTruthy()
    })

    it('blocks schedule creation if date fields are missing', async () => {
      render(<CoordinatorManagementPage />)
      
      const phaseSelect = screen.getByLabelText(/Phase/i)
      fireEvent.change(phaseSelect, { target: { value: 'SPRINT' } })

      const submitButton = screen.getByRole('button', { name: /Create Schedule/i })
      fireEvent.click(submitButton)

      expect(await screen.findByText('Start and end date are required.')).toBeTruthy()
    })

    it('blocks schedule creation if end date is before start date', async () => {
      render(<CoordinatorManagementPage />)
      
      fireEvent.change(screen.getByLabelText(/Phase/i), { target: { value: 'ADVISOR_SELECTION' } })
      fireEvent.change(screen.getByLabelText(/Start Date/i), { target: { value: '2026-05-10T10:00' } })
      fireEvent.change(screen.getByLabelText(/End Date/i), { target: { value: '2026-05-01T10:00' } }) // End is older

      const submitButton = screen.getByRole('button', { name: /Create Schedule/i })
      fireEvent.click(submitButton)

      expect(await screen.findByText('End date must be after start date.')).toBeTruthy()
    })

    it('successfully creates schedule and updates active window (Happy path)', async () => {
      createSchedule.mockResolvedValueOnce({ phase: 'COMMITTEE_ASSIGNMENT' })
      getActiveSchedule.mockResolvedValueOnce({ 
        phase: 'COMMITTEE_ASSIGNMENT', 
        startDatetime: '2026-05-01T00:00:00.000Z', 
        endDatetime: '2026-05-10T00:00:00.000Z' 
      })

      render(<CoordinatorManagementPage />)
      
      fireEvent.change(screen.getByLabelText(/Phase/i), { target: { value: 'COMMITTEE_ASSIGNMENT' } })
      fireEvent.change(screen.getByLabelText(/Start Date/i), { target: { value: '2026-05-01T10:00' } })
      fireEvent.change(screen.getByLabelText(/End Date/i), { target: { value: '2026-05-10T10:00' } })

      const submitButton = screen.getByRole('button', { name: /Create Schedule/i })
      fireEvent.click(submitButton)

      expect(await screen.findByText('Active schedule loaded successfully.')).toBeTruthy()
      
      await waitFor(() => {
          expect(createSchedule).toHaveBeenCalledWith({
            phase: 'COMMITTEE_ASSIGNMENT',
            startDatetime: expect.any(String),
            endDatetime: expect.any(String)
          })
          expect(getActiveSchedule).toHaveBeenCalledWith('COMMITTEE_ASSIGNMENT')
      })
    })
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
    fireEvent.change(committeeSearchInputs[0], {
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