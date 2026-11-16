import { Router } from 'express'
import { sendError, sendSuccess } from '../utils/ApiResponse.js'

export function createHealthRouter(getDatabaseState) {
  const router = Router()
  router.get('/', (req, res) => {
    const databaseStatus = getDatabaseState()
    const healthy = databaseStatus === 'connected'
    const health = {
      status: healthy ? 'ok' : 'unavailable',
      database: { status: databaseStatus },
    }

    if (!healthy) {
      sendError(res, {
        statusCode: 503,
        message: 'Service unavailable',
        data: health,
      })
      return
    }

    sendSuccess(res, health, 'Health check passed')
  })

  return router
}
