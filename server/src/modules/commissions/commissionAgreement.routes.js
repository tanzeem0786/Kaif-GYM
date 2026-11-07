import { Router } from 'express'
import { ApiError } from '../../utils/ApiError.js'
import { createAuthenticate } from '../auth/auth.middleware.js'
import { createAuthService } from '../auth/auth.service.js'
import { createCommissionAgreementController } from './commissionAgreement.controller.js'
import {
  commissionAgreementIdParamsSchema,
  commissionAgreementListQuerySchema,
  commissionAgreementTrainerParamsSchema,
  createCommissionAgreementSchema,
  validateBody,
  validateParams,
  validateQuery,
} from './commissionAgreement.validation.js'

export function createCommissionAgreementRouter({
  authConfig,
  AdminModel,
  TrainerModel,
  CommissionAgreementModel,
  AuditLogModel,
}) {
  if (
    !authConfig ||
    !AdminModel ||
    !TrainerModel ||
    !CommissionAgreementModel ||
    !AuditLogModel
  ) {
    throw new ApiError(500, 'Commission agreement routes are not configured')
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
  const controller = createCommissionAgreementController({
    TrainerModel,
    CommissionAgreementModel,
    AuditLogModel,
  })

  router
    .route('/trainers/:trainerId')
    .get(
      validateParams(commissionAgreementTrainerParamsSchema),
      validateQuery(commissionAgreementListQuerySchema),
      controller.listByTrainer,
    )
    .post(
      validateParams(commissionAgreementTrainerParamsSchema),
      validateBody(createCommissionAgreementSchema),
      controller.createVersion,
    )
  router.get(
    '/:agreementId',
    validateParams(commissionAgreementIdParamsSchema),
    controller.getById,
  )
  return router
}
