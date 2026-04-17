import apiClient from './apiClient'
import apiConfig from '../config/api'
import { getHttpErrorDetails } from './httpErrorMessages'

export async function listCommittees(params = {}) {
  try {
    const response = await apiClient.get(apiConfig.endpoints.committees, { params })
    return response.data
  } catch (error) {
    throw getHttpErrorDetails(error, 'Unable to fetch committees.')
  }
}

export async function createCommittee(payload) {
  try {
    const response = await apiClient.post(apiConfig.endpoints.committees, payload)
    return response.data
  } catch (error) {
    throw getHttpErrorDetails(error, 'Unable to create committee.')
  }
}

export async function getCommittee(committeeId) {
  try {
    const response = await apiClient.get(apiConfig.endpoints.committeeById(committeeId))
    return response.data
  } catch (error) {
    throw getHttpErrorDetails(error, 'Unable to fetch committee details.')
  }
}

export async function updateCommittee(committeeId, payload) {
  try {
    const response = await apiClient.patch(apiConfig.endpoints.committeeById(committeeId), payload)
    return response.data
  } catch (error) {
    throw getHttpErrorDetails(error, 'Unable to update committee.')
  }
}

export async function deleteCommittee(committeeId) {
  try {
    await apiClient.delete(apiConfig.endpoints.committeeById(committeeId))
  } catch (error) {
    throw getHttpErrorDetails(error, 'Unable to delete committee.')
  }
}

export async function listJuryMembers(committeeId) {
  try {
    const response = await apiClient.get(apiConfig.endpoints.committeeJuryMembers(committeeId))
    return response.data
  } catch (error) {
    throw getHttpErrorDetails(error, 'Unable to fetch jury members.')
  }
}

export async function addJuryMember(committeeId, userId) {
  try {
    const response = await apiClient.post(apiConfig.endpoints.committeeJuryMembers(committeeId), { userId })
    return response.data
  } catch (error) {
    throw getHttpErrorDetails(error, 'Unable to add jury member.')
  }
}

export async function removeJuryMember(committeeId, userId) {
  try {
    await apiClient.delete(apiConfig.endpoints.committeeJuryMemberByUser(committeeId, userId))
  } catch (error) {
    throw getHttpErrorDetails(error, 'Unable to remove jury member.')
  }
}

export async function listAdvisors(committeeId) {
  try {
    const response = await apiClient.get(apiConfig.endpoints.committeeAdvisors(committeeId))
    return response.data
  } catch (error) {
    throw getHttpErrorDetails(error, 'Unable to fetch advisors.')
  }
}

export async function addAdvisor(committeeId, advisorUserId) {
  try {
    const response = await apiClient.post(apiConfig.endpoints.committeeAdvisors(committeeId), { advisorUserId })
    return response.data
  } catch (error) {
    throw getHttpErrorDetails(error, 'Unable to add advisor.')
  }
}

export async function removeAdvisor(committeeId, advisorUserId) {
  try {
    await apiClient.delete(apiConfig.endpoints.committeeAdvisorByUser(committeeId, advisorUserId))
  } catch (error) {
    throw getHttpErrorDetails(error, 'Unable to remove advisor.')
  }
}

export async function listCommitteeGroups(committeeId) {
  try {
    const response = await apiClient.get(apiConfig.endpoints.committeeGroups(committeeId))
    return response.data
  } catch (error) {
    throw getHttpErrorDetails(error, 'Unable to fetch assigned groups.')
  }
}

export async function assignCommitteeGroup(committeeId, groupId) {
  try {
    const response = await apiClient.post(apiConfig.endpoints.committeeGroups(committeeId), { groupId })
    return response.data
  } catch (error) {
    throw getHttpErrorDetails(error, 'Unable to assign group.')
  }
}

export async function removeCommitteeGroup(committeeId, groupId) {
  try {
    await apiClient.delete(apiConfig.endpoints.committeeGroupById(committeeId, groupId))
  } catch (error) {
    throw getHttpErrorDetails(error, 'Unable to remove group assignment.')
  }
}
