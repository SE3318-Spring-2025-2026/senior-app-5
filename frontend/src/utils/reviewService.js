import apiClient from './apiClient'
import apiConfig from '../config/api'
import { getHttpErrorDetails } from './httpErrorMessages'

async function request(action, fallbackMessage) {
  try {
    const response = await action()
    return response.data
  } catch (error) {
    throw getHttpErrorDetails(error, fallbackMessage)
  }
}

export async function createReview(submissionId, committeeId) {
  return request(
    () => apiClient.post(apiConfig.endpoints.reviews, { submissionId, committeeId }),
    'Unable to create review.',
  )
}

export async function getReview(reviewId) {
  return request(
    () => apiClient.get(apiConfig.endpoints.reviewById(reviewId)),
    'Unable to fetch review.',
  )
}

export async function addComment(reviewId, text) {
  return request(
    () => apiClient.post(apiConfig.endpoints.reviewComments(reviewId), { text }),
    'Unable to add comment.',
  )
}

export async function deleteComment(reviewId, commentId) {
  return request(
    () => apiClient.delete(apiConfig.endpoints.reviewCommentById(reviewId, commentId)),
    'Unable to delete comment.',
  )
}

export async function requestRevision(reviewId, description, dueDatetime) {
  return request(
    () => apiClient.post(apiConfig.endpoints.reviewRevisionRequests(reviewId), {
      description,
      dueDatetime,
    }),
    'Unable to request revision.',
  )
}

export async function submitGrade(reviewId, grade) {
  return request(
    () => apiClient.post(apiConfig.endpoints.reviewGrade(reviewId), { grade }),
    'Unable to submit grade.',
  )
}

export async function getSubmissionsForCommittee(committeeId) {
  return request(
    () => apiClient.get(apiConfig.endpoints.submissions.byCommittee(committeeId)),
    'Unable to fetch committee submissions.',
  )
}
