import { Router } from 'express'
import { membershipController } from './membership.controller.js'
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../../middlewares/requestValidation.js'
import {
  createMembershipSchema,
  createPlanSchema,
  memberIdParamsSchema,
  membershipIdParamsSchema,
  membershipListQuerySchema,
  planIdParamsSchema,
  planListQuerySchema,
  planStatusSchema,
  renewMembershipSchema,
  updatePlanSchema,
} from './membership.validation.js'

export function createMembershipPlanRouter() {
  const router = Router()
  router
    .route('/')
    .get(validateQuery(planListQuerySchema), membershipController.listPlans)
    .post(validateBody(createPlanSchema), membershipController.createPlan)
  router
    .route('/:planId')
    .get(validateParams(planIdParamsSchema), membershipController.getPlan)
    .patch(
      validateParams(planIdParamsSchema),
      validateBody(updatePlanSchema),
      membershipController.updatePlan,
    )
  router.patch(
    '/:planId/status',
    validateParams(planIdParamsSchema),
    validateBody(planStatusSchema),
    membershipController.setPlanStatus,
  )
  return router
}

export function createMembershipRouter() {
  const router = Router()
  router.get('/summary', membershipController.summary)
  router.get(
    '/member/:memberId',
    validateParams(memberIdParamsSchema),
    membershipController.listByMember,
  )
  router
    .route('/')
    .get(validateQuery(membershipListQuerySchema), membershipController.list)
    .post(validateBody(createMembershipSchema), membershipController.create)
  router.post(
    '/:membershipId/renew',
    validateParams(membershipIdParamsSchema),
    validateBody(renewMembershipSchema),
    membershipController.renew,
  )
  router.get(
    '/:membershipId',
    validateParams(membershipIdParamsSchema),
    membershipController.getById,
  )
  return router
}
