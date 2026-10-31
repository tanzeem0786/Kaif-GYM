export function getApiErrorMessage(error, fallback) {
  const responseMessage = error.response?.data?.message
  if (typeof responseMessage === 'string') {
    return responseMessage
  }

  if (error.code === 'ERR_NETWORK') {
    return 'Unable to reach the server. Check your connection and try again.'
  }

  return fallback
}
