import { Router } from 'express'
import { createAuthenticate } from '../auth/auth.middleware.js'
import { createAuthService } from '../auth/auth.service.js'
import { ApiError } from '../../utils/ApiError.js'
import { createMembershipController } from './membership.controller.js'
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
  validateBody,
  validateParams,
  validateQuery,
} from './membership.validation.js'

function createRouters({
  authConfig,
  AdminModel,
  MemberModel,
  MembershipModel,
  MembershipPlanModel,
  AuditLogModel,
}) {
  if (
    !authConfig ||
    !AdminModel ||
    !MemberModel ||
    !MembershipModel ||
    !MembershipPlanModel ||
    !AuditLogModel
  ) {
    throw new ApiError(500, 'Membership routes are not configured')
  }
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
  const controller = createMembershipController({
    MemberModel,
    MembershipModel,
    MembershipPlanModel,
    AuditLogModel,
  })

  const planRouter = Router()
  planRouter.use(authenticate)
  planRouter
    .route('/')
    .get(validateQuery(planListQuerySchema), controller.listPlans)
    .post(validateBody(createPlanSchema), controller.createPlan)
  planRouter
    .route('/:planId')
    .get(validateParams(planIdParamsSchema), controller.getPlan)
    .patch(
      validateParams(planIdParamsSchema),
      validateBody(updatePlanSchema),
      controller.updatePlan,
    )
  planRouter.patch(
    '/:planId/status',
    validateParams(planIdParamsSchema),
    validateBody(planStatusSchema),
    controller.setPlanStatus,
  )

  const membershipRouter = Router()
  membershipRouter.use(authenticate)
  membershipRouter.get('/summary', controller.summary)
  membershipRouter.get(
    '/member/:memberId',
    validateParams(memberIdParamsSchema),
    controller.listByMember,
  )
  membershipRouter
    .route('/')
    .get(validateQuery(membershipListQuerySchema), controller.list)
    .post(validateBody(createMembershipSchema), controller.create)
  membershipRouter.post(
    '/:membershipId/renew',
    validateParams(membershipIdParamsSchema),
    validateBody(renewMembershipSchema),
    controller.renew,
  )
  membershipRouter.get(
    '/:membershipId',
    validateParams(membershipIdParamsSchema),
    controller.getById,
  )
  return { planRouter, membershipRouter }
}

export function createMembershipPlanRouter(dependencies) {
  return createRouters(dependencies).planRouter
}

export function createMembershipRouter(dependencies) {
  return createRouters(dependencies).membershipRouter
}
