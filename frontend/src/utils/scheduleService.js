import apiClient from './apiClient'
import apiConfig from '../config/api'
import { getHttpErrorDetails } from './httpErrorMessages'

/**
 * Creates a new project phase schedule.
 * @param {Object} payload - The exact schedule payload required by the backend.
 * @param {"ADVISOR_SELECTION" | "COMMITTEE_ASSIGNMENT" | "SPRINT"} payload.phase - The target phase.
 * @param {string} payload.startDatetime - Start date in ISO 8601 format.
 * @param {string} payload.endDatetime - End date in ISO 8601 format.
 * @returns {Promise<Object>} The created schedule object.
 */
export async function createSchedule(payload) {
  try {
    const response = await apiClient.post(apiConfig.endpoints.schedules, payload)
    return response.data
  } catch (error) {
    throw getHttpErrorDetails(error, 'Unable to create schedule.')
  }
}

/**
 * Fetches the active schedule for a specific phase.
 * @param {string} [phase] - Optional phase filter.
 */
export async function getActiveSchedule(phase) {
  try {
    const params = phase ? { phase } : {}
    const response = await apiClient.get(apiConfig.endpoints.schedulesActive, { params })
    return response.data
  } catch (error) {
    throw getHttpErrorDetails(error, 'Unable to fetch active schedule.')
  }
}

/**
 * Fetches the grading window (Project specific).
 */
export async function getGradingWindow() {
  try {
    const response = await apiClient.get(apiConfig.endpoints.gradingWindow)
    return response.data
  } catch (error) {
    throw getHttpErrorDetails(error, 'Unable to fetch grading window.')
  }
}