import { ZodError } from 'zod'
import { ApiError } from '../utils/ApiError.js'
import { sendError } from '../utils/ApiResponse.js'

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error)
    return
  }

  if (error instanceof ZodError) {
    const errors = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }))
    sendError(res, { statusCode: 400, message: 'Request validation failed', errors })
    return
  }

  if (error.name === 'ValidationError' && error.errors) {
    const errors = Object.values(error.errors).map((issue) => ({
      field: issue.path,
      message: issue.message,
    }))
    sendError(res, { statusCode: 400, message: 'Request validation failed', errors })
    return
  }

  if (error.type === 'entity.parse.failed') {
    sendError(res, { statusCode: 400, message: 'Invalid JSON request body' })
    return
  }

  if (error.type === 'entity.too.large') {
    sendError(res, { statusCode: 413, message: 'Request body is too large' })
    return
  }

  if (error instanceof ApiError) {
    sendError(res, {
      statusCode: error.statusCode,
      message: error.message,
      errors: error.errors,
    })
    return
  }

  console.error(
    JSON.stringify({
      level: 'error',
      message: 'Unhandled request error',
      errorName: error.name,
    }),
  )
  sendError(res, { statusCode: 500, message: 'Internal server error' })
}
