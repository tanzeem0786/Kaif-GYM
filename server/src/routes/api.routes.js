import { Router } from 'express'
import { createHealthRouter } from './health.routes.js'
import { sendSuccess } from '../utils/ApiResponse.js'
import { createAuthRouter } from '../modules/auth/auth.routes.js'

export function createApiRouter({
  getDatabaseState,
  authConfig,
  AdminModel,
  loginRateLimit,
  loginWindowMs,
}) {
  const apiRouter = Router()

  apiRouter.get('/', (req, res) => {
    sendSuccess(res, { apiVersion: 'v1' }, "Kaif's GYM API is available")
  })
  apiRouter.use('/health', createHealthRouter(getDatabaseState))
  if (authConfig) {
    apiRouter.use(
      '/auth',
      createAuthRouter({ authConfig, AdminModel, loginRateLimit, loginWindowMs }),
    )
  }

  return apiRouter
}
