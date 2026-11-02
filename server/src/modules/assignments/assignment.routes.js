import { Router } from 'express'
import { ApiError } from '../../utils/ApiError.js'
import { createAuthenticate } from '../auth/auth.middleware.js'
import { createAuthService } from '../auth/auth.service.js'
import { createAssignmentController } from './assignment.controller.js'
import {
  assignmentIdParamsSchema,
  assignmentListQuerySchema,
  assignmentMemberIdParamsSchema,
  assignmentTrainerIdParamsSchema,
  createAssignmentSchema,
  endAssignmentSchema,
  validateBody,
  validateParams,
  validateQuery,
} from './assignment.validation.js'

export function createAssignmentRouter({
  authConfig,
  AdminModel,
  MemberModel,
  TrainerModel,
  AssignmentModel,
  AuditLogModel,
}) {
  if (
    !authConfig ||
    !AdminModel ||
    !MemberModel ||
    !TrainerModel ||
    !AssignmentModel ||
    !AuditLogModel
  ) {
    throw new ApiError(500, 'Trainer assignment routes are not configured')
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
  const controller = createAssignmentController({
    MemberModel,
    TrainerModel,
    AssignmentModel,
    AuditLogModel,
  })

  router.get('/', validateQuery(assignmentListQuerySchema), controller.list)
  router.post('/', validateBody(createAssignmentSchema), controller.create)
  router.get(
    '/member/:memberId',
    validateParams(assignmentMemberIdParamsSchema),
    validateQuery(assignmentListQuerySchema),
    controller.listByMember,
  )
  router.get(
    '/trainer/:trainerId',
    validateParams(assignmentTrainerIdParamsSchema),
    validateQuery(assignmentListQuerySchema),
    controller.listByTrainer,
  )
  router.patch(
    '/:assignmentId/end',
    validateParams(assignmentIdParamsSchema),
    validateBody(endAssignmentSchema),
    controller.end,
  )
  router.get(
    '/:assignmentId',
    validateParams(assignmentIdParamsSchema),
    controller.getById,
  )
  return router
}
