import { Router } from 'express'
import { createAuthenticate } from '../auth/auth.middleware.js'
import { createAuthService } from '../auth/auth.service.js'
import { ApiError } from '../../utils/ApiError.js'
import { createMemberController } from './member.controller.js'
import {
  createMemberSchema,
  memberIdParamsSchema,
  memberListQuerySchema,
  memberStatusSchema,
  updateMemberSchema,
  validateBody,
  validateParams,
  validateQuery,
} from './member.validation.js'

export function createMemberRouter({ authConfig, AdminModel, MemberModel, AuditLogModel }) {
  if (!authConfig || !AdminModel || !MemberModel || !AuditLogModel) {
    throw new ApiError(500, 'Member routes are not configured')
  }

  const router = Router()
  const authService = createAuthService({
    AdminModel,
    jwtSecret: authConfig.JWT_SECRET,
    jwtExpiresIn: authConfig.JWT_EXPIRES_IN,
  })
  const authenticate = createAuthenticate({
    AdminModel,
    authService,
    cookieName: authConfig.COOKIE_NAME,
  })
  const controller = createMemberController({ MemberModel, AuditLogModel })

  router.use(authenticate)
  router
    .route('/')
    .get(validateQuery(memberListQuerySchema), controller.list)
    .post(validateBody(createMemberSchema), controller.create)
  router.patch(
    '/:memberId/status',
    validateParams(memberIdParamsSchema),
    validateBody(memberStatusSchema),
    controller.setStatus,
  )
  router
    .route('/:memberId')
    .get(validateParams(memberIdParamsSchema), controller.getById)
    .patch(
      validateParams(memberIdParamsSchema),
      validateBody(updateMemberSchema),
      controller.update,
    )

  return router
}
