import { Router } from 'express'
import { ApiError } from '../../utils/ApiError.js'
import { createAuthenticate } from '../auth/auth.middleware.js'
import { createAuthService } from '../auth/auth.service.js'
import { createTrainerController } from './trainer.controller.js'
import {
  createTrainerSchema,
  trainerIdParamsSchema,
  trainerListQuerySchema,
  trainerStatusSchema,
  updateTrainerSchema,
  validateBody,
  validateParams,
  validateQuery,
} from './trainer.validation.js'

export function createTrainerRouter({ authConfig, AdminModel, TrainerModel, AuditLogModel }) {
  if (!authConfig || !AdminModel || !TrainerModel || !AuditLogModel) {
    throw new ApiError(500, 'Trainer routes are not configured')
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
  const controller = createTrainerController({ TrainerModel, AuditLogModel })

  router
    .route('/')
    .get(validateQuery(trainerListQuerySchema), controller.list)
    .post(validateBody(createTrainerSchema), controller.create)
  router.patch(
    '/:trainerId/status',
    validateParams(trainerIdParamsSchema),
    validateBody(trainerStatusSchema),
    controller.setStatus,
  )
  router
    .route('/:trainerId')
    .get(validateParams(trainerIdParamsSchema), controller.getById)
    .patch(
      validateParams(trainerIdParamsSchema),
      validateBody(updateTrainerSchema),
      controller.update,
    )
  return router
}
