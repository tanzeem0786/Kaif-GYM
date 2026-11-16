import { Router } from 'express'
import { createHealthRouter } from './health.routes.js'
import { sendSuccess } from '../utils/ApiResponse.js'
import { createAuthenticate } from '../modules/auth/auth.middleware.js'
import { createAuthRouter } from '../modules/auth/auth.routes.js'
import { createMemberRouter } from '../modules/members/member.routes.js'
import {
  createMembershipPlanRouter,
  createMembershipRouter,
} from '../modules/memberships/membership.routes.js'
import { createTrainerRouter } from '../modules/trainers/trainer.routes.js'
import { createAssignmentRouter } from '../modules/assignments/assignment.routes.js'
import { paymentRouter } from '../modules/payments/payment.routes.js'
import { createCommissionAgreementRouter } from '../modules/commissions/commissionAgreement.routes.js'

export function createApiRouter({
  getDatabaseState,
  authConfig,
  loginRateLimit,
  loginWindowMs,
}) {
  const apiRouter = Router()

  apiRouter.get('/', (req, res) => {
    sendSuccess(res, { apiVersion: 'v1' }, "Barbell Arena API is available")
  })
  apiRouter.use('/health', createHealthRouter(getDatabaseState))
  if (authConfig) {
    const authenticate = createAuthenticate({
      cookieName: authConfig.COOKIE_NAME,
      jwtSecret: authConfig.JWT_SECRET,
    })

    apiRouter.use(
      '/auth',
      createAuthRouter({ authConfig, authenticate, loginRateLimit, loginWindowMs }),
    )
    apiRouter.use(
      '/members',
      authenticate,
      createMemberRouter(),
    )
    apiRouter.use(
      '/membership-plans',
      authenticate,
      createMembershipPlanRouter(),
    )
    apiRouter.use('/memberships', authenticate, createMembershipRouter())
    apiRouter.use(
      '/trainers',
      authenticate,
      createTrainerRouter(),
    )
    apiRouter.use('/trainer-assignments', authenticate, createAssignmentRouter())
    apiRouter.use('/payments', authenticate, paymentRouter)
    apiRouter.use('/commission-agreements', authenticate, createCommissionAgreementRouter())
  }

  return apiRouter
}
