import { getHealthStatus } from '../services/health.service.js'
import { sendError, sendSuccess } from '../utils/ApiResponse.js'

export function createHealthController(getDatabaseState) {
  return function getHealth(req, res) {
    const health = getHealthStatus(getDatabaseState())

    if (health.status !== 'ok') {
      sendError(res, {
        statusCode: 503,
        message: 'Service unavailable',
        data: health,
      })
      return
    }

    sendSuccess(res, health, 'Health check passed')
  }
}
