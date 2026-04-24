import apiClient from './apiClient'
import apiConfig from '../config/api'
import { getHttpErrorDetails } from './httpErrorMessages'

export async function createSchedule(payload) {
  try {
    const response = await apiClient.post(apiConfig.endpoints.schedules, payload)
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
