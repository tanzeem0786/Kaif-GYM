import { Router } from 'express'
import { createHealthRouter } from './health.routes.js'
import { sendSuccess } from '../utils/ApiResponse.js'

export function createApiRouter(getDatabaseState) {
  const apiRouter = Router()

  apiRouter.get('/', (req, res) => {
    sendSuccess(res, { apiVersion: 'v1' }, "Kaif's GYM API is available")
  })
  apiRouter.use('/health', createHealthRouter(getDatabaseState))

  return apiRouter
}
