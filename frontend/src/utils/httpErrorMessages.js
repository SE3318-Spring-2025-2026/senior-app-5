export const DEFAULT_ERROR_MESSAGE = 'An unexpected error occurred. Please try again.'

export function getHttpErrorDetails(error, fallbackMessage = DEFAULT_ERROR_MESSAGE) {
  const status = error?.response?.status
  const backendMessage = error?.response?.data?.message

  const mappedByStatus = {
    400: 'Request payload is invalid. Please review the form fields.',
    401: 'Your session has expired. Please sign in again.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested resource was not found.',
    409: 'This action conflicts with existing committee data.',
    422: 'This action violates a prerequisite or validation rule.',
    423: 'This action is locked because the schedule window is closed.',
    500: 'Server error occurred while processing your request.',
  }

  let message = fallbackMessage

  if (Array.isArray(backendMessage) && backendMessage.length > 0) {
    message = backendMessage.join(', ')
  } else if (typeof backendMessage === 'string' && backendMessage.trim()) {
    message = backendMessage
  } else if (status && mappedByStatus[status]) {
    message = mappedByStatus[status]
  }

  return { status, message }
}
