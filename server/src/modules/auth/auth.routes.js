import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { ApiError } from '../../utils/ApiError.js'
import { createAuthController } from './auth.controller.js'
import { createAuthenticate } from './auth.middleware.js'
import { loginSchema, validateBody } from './auth.validation.js'

export function createAuthRouter({
  authConfig,
  AdminModel,
  loginRateLimit = 5,
  loginWindowMs = 15 * 60 * 1000,
}) {
  const router = Router()
  const controller = createAuthController({ AdminModel, authConfig })
  const authenticate = createAuthenticate({
    AdminModel,
    authService: controller.authService,
    cookieName: authConfig.COOKIE_NAME,
  })
  const loginLimiter = rateLimit({
    windowMs: loginWindowMs,
    limit: loginRateLimit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler(req, res, next) {
      next(new ApiError(429, 'Too many login attempts. Please try again later.'))
    },
  })

  router.post('/login', loginLimiter, validateBody(loginSchema), controller.login)
  router.post('/logout', controller.logout)
  router.get('/me', authenticate, controller.me)

  return router
}
