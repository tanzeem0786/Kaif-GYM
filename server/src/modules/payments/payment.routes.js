import { Router } from 'express'
import { ApiError } from '../../utils/ApiError.js'
import { createAuthenticate } from '../auth/auth.middleware.js'
import { createAuthService } from '../auth/auth.service.js'
import { createPaymentController } from './payment.controller.js'
import {
  createPaymentSchema,
  createReversalSchema,
  paymentIdParamsSchema,
  paymentListQuerySchema,
  paymentMemberIdParamsSchema,
  validateBody,
  validateParams,
  validateQuery,
} from './payment.validation.js'

export function createPaymentRouter({
  authConfig,
  AdminModel,
  MemberModel,
  MembershipModel,
  PaymentModel,
  AuditLogModel,
}) {
  if (
    !authConfig ||
    !AdminModel ||
    !MemberModel ||
    !MembershipModel ||
    !PaymentModel ||
    !AuditLogModel
  ) {
    throw new ApiError(500, 'Payment routes are not configured')
  }
  const authService = createAuthService({
    AdminModel,
    jwtSecret: authConfig.JWT_SECRET,
    jwtExpiresIn: authConfig.JWT_EXPIRES_IN,
  })
  const router = Router()
  router.use(
    createAuthenticate({
      AdminModel,
      authService,
      cookieName: authConfig.COOKIE_NAME,
    }),
  )
  const controller = createPaymentController({
    MemberModel,
    MembershipModel,
    PaymentModel,
    AuditLogModel,
  })

  router
    .route('/')
    .get(validateQuery(paymentListQuerySchema), controller.list)
    .post(validateBody(createPaymentSchema), controller.create)
  router.get(
    '/member/:memberId',
    validateParams(paymentMemberIdParamsSchema),
    validateQuery(paymentListQuerySchema),
    controller.listByMember,
  )
  router.post(
    '/:paymentId/reversals',
    validateParams(paymentIdParamsSchema),
    validateBody(createReversalSchema),
    controller.reverse,
  )
  router.get(
    '/:paymentId/receipt',
    validateParams(paymentIdParamsSchema),
    controller.receipt,
  )
  router.get(
    '/:paymentId',
    validateParams(paymentIdParamsSchema),
    controller.getById,
  )
  return router
}
