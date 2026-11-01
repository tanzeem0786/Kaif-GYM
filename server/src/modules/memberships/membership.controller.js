import { sendSuccess } from '../../utils/ApiResponse.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { createMembershipService } from './membership.service.js'

export function createMembershipController({
  MemberModel,
  MembershipModel,
  MembershipPlanModel,
  AuditLogModel,
}) {
  const service = createMembershipService({
    MemberModel,
    MembershipModel,
    MembershipPlanModel,
    AuditLogModel,
  })

  return {
    createPlan: asyncHandler(async (req, res) => {
      const plan = await service.createPlan(req.body, req.admin.id, req.ip)
      sendSuccess(res, { plan }, 'Membership plan created successfully', 201)
    }),

    listPlans: asyncHandler(async (req, res) => {
      const result = await service.listPlans(req.validatedQuery)
      sendSuccess(res, result, 'Membership plans retrieved successfully')
    }),

    getPlan: asyncHandler(async (req, res) => {
      const plan = await service.getPlan(req.validatedParams.planId)
      sendSuccess(res, { plan }, 'Membership plan retrieved successfully')
    }),

    updatePlan: asyncHandler(async (req, res) => {
      const plan = await service.updatePlan(
        req.validatedParams.planId,
        req.body,
        req.admin.id,
        req.ip,
      )
      sendSuccess(res, { plan }, 'Membership plan updated successfully')
    }),

    setPlanStatus: asyncHandler(async (req, res) => {
      const plan = await service.setPlanStatus(
        req.validatedParams.planId,
        req.body.isActive,
        req.admin.id,
        req.ip,
      )
      sendSuccess(res, { plan }, 'Membership plan status updated successfully')
    }),

    create: asyncHandler(async (req, res) => {
      const membership = await service.create(req.body, req.admin.id, req.ip)
      sendSuccess(res, { membership }, 'Membership assigned successfully', 201)
    }),

    renew: asyncHandler(async (req, res) => {
      const membership = await service.renew(
        req.validatedParams.membershipId,
        req.body,
        req.admin.id,
        req.ip,
      )
      sendSuccess(res, { membership }, 'Membership renewed successfully', 201)
    }),

    list: asyncHandler(async (req, res) => {
      const result = await service.list(req.validatedQuery)
      sendSuccess(res, result, 'Memberships retrieved successfully')
    }),

    listByMember: asyncHandler(async (req, res) => {
      const result = await service.listByMember(req.params.memberId)
      sendSuccess(res, result, 'Member memberships retrieved successfully')
    }),

    getById: asyncHandler(async (req, res) => {
      const membership = await service.getById(req.validatedParams.membershipId)
      sendSuccess(res, { membership }, 'Membership retrieved successfully')
    }),

    summary: asyncHandler(async (req, res) => {
      const result = await service.summary()
      sendSuccess(res, result, 'Membership summary retrieved successfully')
    }),
  }
}
