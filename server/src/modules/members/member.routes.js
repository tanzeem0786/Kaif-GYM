import { Router } from 'express'
import { memberController } from './member.controller.js'
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../../middlewares/requestValidation.js'
import {
  createMemberSchema,
  memberIdParamsSchema,
  memberListQuerySchema,
  memberStatusSchema,
  updateMemberSchema,
} from './member.validation.js'

export function createMemberRouter() {
  const router = Router()

  router
    .route('/')
    .get(validateQuery(memberListQuerySchema), memberController.list)
    .post(validateBody(createMemberSchema), memberController.create)
  router.patch(
    '/:memberId/status',
    validateParams(memberIdParamsSchema),
    validateBody(memberStatusSchema),
    memberController.setStatus,
  )
  router
    .route('/:memberId')
    .get(validateParams(memberIdParamsSchema), memberController.getById)
    .patch(
      validateParams(memberIdParamsSchema),
      validateBody(updateMemberSchema),
      memberController.update,
    )
    .delete(validateParams(memberIdParamsSchema), memberController.delete)

  return router
}
