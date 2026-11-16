import { ApiError } from '../../utils/ApiError.js'
import { sendSuccess } from '../../utils/ApiResponse.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { AuditLog } from '../audit/auditLog.model.js'
import { Member } from '../members/member.model.js'
import { Membership } from './models/membership.model.js'
import { MembershipPlan } from './models/membershipPlan.model.js'
import { assignMembership, expireMemberships, renewMembership } from './membership.service.js'

const membershipPopulation = [
  { path: 'member', select: 'memberCode fullName fatherName phone email' },
  { path: 'plan', select: 'name durationMonths pricePaise isActive' },
  { path: 'renewalOf', select: 'membershipCode startDate expiryDate status' },
]

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function listMemberships({ page, limit, search, memberId, planId, status, sortBy, sortOrder }) {
  const filter = {}
  if (memberId) filter.member = memberId
  if (planId) filter.plan = planId
  if (status) filter.status = status

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i')
    const [memberIds, snapshotMembershipIds, planIds] = await Promise.all([
      Member.find({
        $or: [
          { memberCode: pattern },
          { fullName: pattern },
          { fatherName: pattern },
          { phone: pattern },
          { email: pattern },
        ],
      }).distinct('_id'),
      Membership.find({
        $or: [
          { 'memberSnapshot.memberCode': pattern },
          { 'memberSnapshot.fullName': pattern },
          { 'memberSnapshot.fatherName': pattern },
        ],
      }).distinct('_id'),
      MembershipPlan.find({ name: pattern }).distinct('_id'),
    ])
    filter.$or = [
      { membershipCode: pattern },
      { member: { $in: memberIds } },
      { _id: { $in: snapshotMembershipIds } },
      { plan: { $in: planIds } },
    ]
  }

  const [memberships, total] = await Promise.all([
    Membership.find(filter)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(membershipPopulation)
      .lean(),
    Membership.countDocuments(filter),
  ])
  return {
    memberships,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

export const membershipController = {
  createPlan: asyncHandler(async (req, res) => {
    const plan = new MembershipPlan(req.body)
    await plan.save()
    await new AuditLog({
      actor: req.admin.id,
      action: 'membershipPlan.created',
      module: 'membershipPlans',
      entityId: plan._id,
      newData: {
        name: plan.name,
        durationMonths: plan.durationMonths,
        pricePaise: plan.pricePaise,
        isActive: plan.isActive,
      },
      ipAddress: req.ip,
    }).save()
    sendSuccess(res, { plan: plan.toObject({ versionKey: false }) }, 'Membership plan created successfully', 201)
  }),

  listPlans: asyncHandler(async (req, res) => {
    const { page, limit, search, durationMonths, isActive, sortBy, sortOrder } =
      req.validatedQuery
    const filter = {}
    if (search) filter.name = new RegExp(escapeRegex(search), 'i')
    if (durationMonths !== undefined) filter.durationMonths = durationMonths
    if (isActive !== undefined) filter.isActive = isActive

    const [plans, total] = await Promise.all([
      MembershipPlan.find(filter)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      MembershipPlan.countDocuments(filter),
    ])
    sendSuccess(
      res,
      { plans, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
      'Membership plans retrieved successfully',
    )
  }),

  getPlan: asyncHandler(async (req, res) => {
    const plan = await MembershipPlan.findById(req.validatedParams.planId).lean()
    if (!plan) throw new ApiError(404, 'Membership plan not found')
    sendSuccess(res, { plan }, 'Membership plan retrieved successfully')
  }),

  updatePlan: asyncHandler(async (req, res) => {
    const plan = await MembershipPlan.findById(req.validatedParams.planId)
    if (!plan) throw new ApiError(404, 'Membership plan not found')
    const previousData = {
      name: plan.name,
      durationMonths: plan.durationMonths,
      pricePaise: plan.pricePaise,
      isActive: plan.isActive,
    }
    plan.set(req.body)
    await plan.save()
    await new AuditLog({
      actor: req.admin.id,
      action: 'membershipPlan.updated',
      module: 'membershipPlans',
      entityId: plan._id,
      previousData,
      newData: {
        name: plan.name,
        durationMonths: plan.durationMonths,
        pricePaise: plan.pricePaise,
        isActive: plan.isActive,
      },
      ipAddress: req.ip,
    }).save()
    sendSuccess(res, { plan: plan.toObject({ versionKey: false }) }, 'Membership plan updated successfully')
  }),

  setPlanStatus: asyncHandler(async (req, res) => {
    const plan = await MembershipPlan.findById(req.validatedParams.planId)
    if (!plan) throw new ApiError(404, 'Membership plan not found')

    if (plan.isActive !== req.body.isActive) {
      const previousStatus = plan.isActive
      plan.isActive = req.body.isActive
      await plan.save()
      await new AuditLog({
        actor: req.admin.id,
        action: plan.isActive ? 'membershipPlan.reactivated' : 'membershipPlan.deactivated',
        module: 'membershipPlans',
        entityId: plan._id,
        previousData: { isActive: previousStatus },
        newData: { isActive: plan.isActive },
        ipAddress: req.ip,
      }).save()
    }
    sendSuccess(res, { plan: plan.toObject({ versionKey: false }) }, 'Membership plan status updated successfully')
  }),

  create: asyncHandler(async (req, res) => {
    const membership = await assignMembership(req.body, req.admin.id, req.ip)
    sendSuccess(res, { membership }, 'Membership assigned successfully', 201)
  }),

  renew: asyncHandler(async (req, res) => {
    const membership = await renewMembership(
      req.validatedParams.membershipId,
      req.body,
      req.admin.id,
      req.ip,
    )
    sendSuccess(res, { membership }, 'Membership renewed successfully', 201)
  }),

  list: asyncHandler(async (req, res) => {
    await expireMemberships()
    sendSuccess(
      res,
      await listMemberships(req.validatedQuery),
      'Memberships retrieved successfully',
    )
  }),

  listByMember: asyncHandler(async (req, res) => {
    const { memberId } = req.validatedParams
    const [memberExists, historyExists] = await Promise.all([
      Member.exists({ _id: memberId }),
      Membership.exists({ member: memberId }),
    ])
    if (!memberExists && !historyExists) throw new ApiError(404, 'Member not found')

    await expireMemberships()
    sendSuccess(
      res,
      await listMemberships({
        page: 1,
        limit: 100,
        search: '',
        memberId,
        sortBy: 'startDate',
        sortOrder: 'desc',
      }),
      'Member memberships retrieved successfully',
    )
  }),

  getById: asyncHandler(async (req, res) => {
    await expireMemberships()
    const membership = await Membership.findById(req.validatedParams.membershipId)
      .populate(membershipPopulation)
      .lean()
    if (!membership) throw new ApiError(404, 'Membership not found')
    sendSuccess(res, { membership }, 'Membership retrieved successfully')
  }),

  summary: asyncHandler(async (req, res) => {
    await expireMemberships()
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const [active, expired, plans] = await Promise.all([
      Membership.countDocuments({
        status: 'active',
        startDate: { $lte: today },
        expiryDate: { $gt: today },
      }),
      Membership.countDocuments({ status: 'expired' }),
      MembershipPlan.countDocuments({ isActive: true }),
    ])
    sendSuccess(
      res,
      { activeMemberships: active, expiredMemberships: expired, activePlans: plans },
      'Membership summary retrieved successfully',
    )
  }),
}
