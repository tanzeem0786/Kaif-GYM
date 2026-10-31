export function sendSuccess(res, data, message = 'Request successful', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  })
}

export function sendError(res, { statusCode = 500, message, errors = [], data }) {
  const response = { success: false, message, errors }

  if (data !== undefined) {
    response.data = data
  }

  return res.status(statusCode).json(response)
}
