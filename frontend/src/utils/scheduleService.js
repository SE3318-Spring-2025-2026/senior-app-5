import apiClient from './apiClient'
import apiConfig from '../config/api'
import { getHttpErrorDetails } from './httpErrorMessages'

function normalizeSchedulePayload(payload = {}) {
  const phase = typeof payload.phase === 'string' ? payload.phase.trim() : payload.phase
  const startDatetime = payload.startDatetime ?? payload.startAt
  const endDatetime = payload.endDatetime ?? payload.endAt

  return {
    phase,
    startDatetime,
    endDatetime,
  }
}

export async function createSchedule(payload) {
  try {
    const response = await apiClient.post(apiConfig.endpoints.schedules, normalizeSchedulePayload(payload))
    return response.data
  } catch (error) {
    throw getHttpErrorDetails(error, 'Unable to create schedule.')
  }
}

export async function getActiveSchedule() {
  try {
    const response = await apiClient.get(apiConfig.endpoints.schedulesActive)
    return response.data
  } catch (error) {
    throw getHttpErrorDetails(error, 'Unable to fetch active schedule.')
  }
}

export async function getGradingWindow() {
  try {
    const response = await apiClient.get(apiConfig.endpoints.gradingWindow)
    return response.data
  } catch (error) {
    throw getHttpErrorDetails(error, 'Unable to fetch grading window.')
  }
}
