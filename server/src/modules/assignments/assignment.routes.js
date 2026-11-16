import { Router } from 'express'
import { assignmentController } from './assignment.controller.js'
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../../middlewares/requestValidation.js'
import {
  assignmentIdParamsSchema,
  assignmentListQuerySchema,
  assignmentMemberIdParamsSchema,
  assignmentTrainerIdParamsSchema,
  createAssignmentSchema,
  endAssignmentSchema,
} from './assignment.validation.js'

export function createAssignmentRouter() {
  const router = Router()

  router.get('/', validateQuery(assignmentListQuerySchema), assignmentController.list)
  router.post('/', validateBody(createAssignmentSchema), assignmentController.create)
  router.get(
    '/member/:memberId',
    validateParams(assignmentMemberIdParamsSchema),
    validateQuery(assignmentListQuerySchema),
    assignmentController.listByMember,
  )
  router.get(
    '/trainer/:trainerId',
    validateParams(assignmentTrainerIdParamsSchema),
    validateQuery(assignmentListQuerySchema),
    assignmentController.listByTrainer,
  )
  router.patch(
    '/:assignmentId/end',
    validateParams(assignmentIdParamsSchema),
    validateBody(endAssignmentSchema),
    assignmentController.end,
  )
  router.get(
    '/:assignmentId',
    validateParams(assignmentIdParamsSchema),
    assignmentController.getById,
  )
  return router
}
