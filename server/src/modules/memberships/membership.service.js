import { randomBytes } from 'node:crypto'
import { ApiError } from '../../utils/ApiError.js'

const MEMBERSHIP_CODE_ATTEMPTS = 3

function startOfUtcDay(value) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
}

export function addMonthsUtc(value, durationMonths) {
  const year = value.getUTCFullYear()
  const month = value.getUTCMonth() + durationMonths
  const day = value.getUTCDate()
  const targetYear = year + Math.floor(month / 12)
  const targetMonth = month % 12
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  return new Date(Date.UTC(targetYear, targetMonth, Math.min(day, lastDay)))
}

function makeMembershipCode() {
  return `KGM-${randomBytes(8).toString('hex').toUpperCase()}`
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isDuplicateMembership(error) {
  return error?.code === 11000
}

function membershipProjection() {
  return [
    { path: 'member', select: 'memberCode firstName lastName phone email' },
    { path: 'plan', select: 'name durationMonths pricePaise isActive' },
    { path: 'renewalOf', select: 'membershipCode startDate expiryDate status' },
  ]
}

export function createMembershipService({
  MemberModel,
  MembershipModel,
  MembershipPlanModel,
  AuditLogModel,
  now = () => new Date(),
}) {
  async function writeAudit({ actorId, action, membership, previousData, newData, ipAddress }) {
    await new AuditLogModel({
      ...(actorId ? { actor: actorId } : {}),
      actorType: actorId ? 'admin' : 'system',
      action,
      module: 'memberships',
      entityId: membership._id,
      previousData,
      newData,
      metadata: {
        membershipCode: membership.membershipCode,
        memberId: membership.member,
        ...(membership.renewalOf ? { renewalOf: membership.renewalOf } : {}),
      },
      ipAddress,
    }).save()
  }

  async function ensureActivePlan(planId) {
    const plan = await MembershipPlanModel.findOne({ _id: planId, isActive: true })
    if (!plan) {
      const exists = await MembershipPlanModel.exists({ _id: planId })
      if (!exists) {
        throw new ApiError(404, 'Membership plan not found')
      }
      throw new ApiError(409, 'Inactive plans cannot be assigned')
    }
    return plan
  }

  async function createMembership({
    member,
    plan,
    startDate,
    renewalOf,
    actorId,
    ipAddress,
    action,
  }) {
    const expiryDate = addMonthsUtc(startDate, plan.durationMonths)
    for (let attempt = 0; attempt < MEMBERSHIP_CODE_ATTEMPTS; attempt += 1) {
      const membership = new MembershipModel({
        membershipCode: makeMembershipCode(),
        member: member._id,
        plan: plan._id,
        planSnapshot: {
          name: plan.name,
          durationMonths: plan.durationMonths,
          pricePaise: plan.pricePaise,
        },
        startDate,
        expiryDate,
        originalExpiryDate: expiryDate,
        totalFeePaise: plan.pricePaise,
        amountPaidPaise: 0,
        outstandingBalancePaise: plan.pricePaise,
        status: 'active',
        ...(renewalOf ? { renewalOf } : {}),
      })

      try {
        await membership.save()
        await writeAudit({
          actorId,
          action,
          membership,
          newData: {
            memberId: member._id,
            planId: plan._id,
            planSnapshot: membership.planSnapshot.toObject(),
            startDate,
            expiryDate,
            totalFeePaise: plan.pricePaise,
            status: membership.status,
          },
          ipAddress,
        })
        return membership
      } catch (error) {
        if (isDuplicateMembership(error) && attempt < MEMBERSHIP_CODE_ATTEMPTS - 1) {
          const codeConflict = error.keyPattern?.membershipCode === 1
          if (codeConflict) {
            continue
          }
        }
        if (isDuplicateMembership(error)) {
          throw new ApiError(409, 'A membership already exists in this renewal sequence')
        }
        throw error
      }
    }

    throw new ApiError(409, 'Unable to allocate a unique membership code')
  }

  return {
    async createPlan(input, actorId, ipAddress) {
      const plan = new MembershipPlanModel(input)
      await plan.save()
      await new AuditLogModel({
        actor: actorId,
        action: 'membershipPlan.created',
        module: 'membershipPlans',
        entityId: plan._id,
        newData: {
          name: plan.name,
          durationMonths: plan.durationMonths,
          pricePaise: plan.pricePaise,
          isActive: plan.isActive,
        },
        ipAddress,
      }).save()
      return plan.toObject({ versionKey: false })
    },

    async listPlans({ page, limit, search, durationMonths, isActive, sortBy, sortOrder }) {
      const filter = {}
      if (search) {
        filter.name = new RegExp(escapeRegex(search), 'i')
      }
      if (durationMonths !== undefined) {
        filter.durationMonths = durationMonths
      }
      if (isActive !== undefined) {
        filter.isActive = isActive
      }
      const [plans, total] = await Promise.all([
        MembershipPlanModel.find(filter)
          .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1, _id: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        MembershipPlanModel.countDocuments(filter),
      ])
      return { plans, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
    },

    async getPlan(planId) {
      const plan = await MembershipPlanModel.findById(planId).lean()
      if (!plan) {
        throw new ApiError(404, 'Membership plan not found')
      }
      return plan
    },

    async updatePlan(planId, input, actorId, ipAddress) {
      const plan = await MembershipPlanModel.findById(planId)
      if (!plan) {
        throw new ApiError(404, 'Membership plan not found')
      }
      const previousData = {
        name: plan.name,
        durationMonths: plan.durationMonths,
        pricePaise: plan.pricePaise,
        isActive: plan.isActive,
      }
      plan.set(input)
      await plan.save()
      await new AuditLogModel({
        actor: actorId,
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
        ipAddress,
      }).save()
      return plan.toObject({ versionKey: false })
    },

    async setPlanStatus(planId, isActive, actorId, ipAddress) {
      const plan = await MembershipPlanModel.findById(planId)
      if (!plan) {
        throw new ApiError(404, 'Membership plan not found')
      }
      if (plan.isActive === isActive) {
        return plan.toObject({ versionKey: false })
      }
      const previousStatus = plan.isActive
      plan.isActive = isActive
      await plan.save()
      await new AuditLogModel({
        actor: actorId,
        action: isActive ? 'membershipPlan.reactivated' : 'membershipPlan.deactivated',
        module: 'membershipPlans',
        entityId: plan._id,
        previousData: { isActive: previousStatus },
        newData: { isActive },
        ipAddress,
      }).save()
      return plan.toObject({ versionKey: false })
    },

    async create({ memberId, planId, startDate }, actorId, ipAddress) {
      const member = await MemberModel.findById(memberId)
      if (!member) {
        throw new ApiError(404, 'Member not found')
      }
      const hasMembership = await MembershipModel.exists({ member: member._id })
      if (hasMembership) {
        throw new ApiError(409, 'This member already has membership history; use renewal')
      }
      const plan = await ensureActivePlan(planId)
      try {
        return await createMembership({
          member,
          plan,
          startDate,
          actorId,
          ipAddress,
          action: 'membership.assigned',
        })
      } catch (error) {
        if (isDuplicateMembership(error)) {
          throw new ApiError(409, 'This member already has membership history; use renewal')
        }
        throw error
      }
    },

    async renew(membershipId, { planId, startDate }, actorId, ipAddress) {
      const previous = await MembershipModel.findById(membershipId)
      if (!previous) {
        throw new ApiError(404, 'Membership not found')
      }
      if (previous.status === 'frozen' || previous.status === 'inactive') {
        throw new ApiError(409, 'This membership status does not allow renewal')
      }
      if (await MembershipModel.exists({ renewalOf: previous._id })) {
        throw new ApiError(409, 'Only the latest membership in a renewal sequence can be renewed')
      }
      const [member, plan] = await Promise.all([
        MemberModel.findById(previous.member),
        ensureActivePlan(planId),
      ])
      if (!member) {
        throw new ApiError(404, 'Member not found')
      }
      const today = startOfUtcDay(now())
      const requestedStart = startDate ?? today
      const start =
        previous.expiryDate > today
          ? previous.expiryDate
          : requestedStart > previous.expiryDate
            ? requestedStart
            : previous.expiryDate
      try {
        return await createMembership({
          member,
          plan,
          startDate: start,
          renewalOf: previous._id,
          actorId,
          ipAddress,
          action: 'membership.renewed',
        })
      } catch (error) {
        if (isDuplicateMembership(error)) {
          throw new ApiError(409, 'This membership was already renewed')
        }
        throw error
      }
    },

    async expireMemberships() {
      const today = startOfUtcDay(now())
      const expired = await MembershipModel.find({
        status: 'active',
        expiryDate: { $lte: today },
      })
        .select('_id membershipCode member startDate expiryDate totalFeePaise status')
        .lean()
      let updatedCount = 0
      for (const previous of expired) {
        const membership = await MembershipModel.findOneAndUpdate(
          { _id: previous._id, status: 'active', expiryDate: { $lte: today } },
          { $set: { status: 'expired' } },
          { new: true },
        )
        if (!membership) {
          continue
        }
        await writeAudit({
          action: 'membership.expired',
          membership,
          previousData: { status: previous.status },
          newData: { status: membership.status, expiryDate: membership.expiryDate },
        })
        updatedCount += 1
      }
      return updatedCount
    },

    async list({ page, limit, search, memberId, planId, status, sortBy, sortOrder }) {
      await this.expireMemberships()
      const filter = {}
      if (memberId) {
        filter.member = memberId
      }
      if (planId) {
        filter.plan = planId
      }
      if (status) {
        filter.status = status
      }
      if (search) {
        const pattern = new RegExp(escapeRegex(search), 'i')
        const [memberIds, planIds] = await Promise.all([
          MemberModel.find({
            $or: [
              { memberCode: pattern },
              { firstName: pattern },
              { lastName: pattern },
              { phone: pattern },
              { email: pattern },
            ],
          }).distinct('_id'),
          MembershipPlanModel.find({ name: pattern }).distinct('_id'),
        ])
        filter.$or = [
          { membershipCode: pattern },
          { member: { $in: memberIds } },
          { plan: { $in: planIds } },
        ]
      }
      const [memberships, total] = await Promise.all([
        MembershipModel.find(filter)
          .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1, _id: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate(membershipProjection())
          .lean(),
        MembershipModel.countDocuments(filter),
      ])
      return {
        memberships,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      }
    },

    async getById(membershipId) {
      await this.expireMemberships()
      const membership = await MembershipModel.findById(membershipId)
        .populate(membershipProjection())
        .lean()
      if (!membership) {
        throw new ApiError(404, 'Membership not found')
      }
      return membership
    },

    async listByMember(memberId) {
      const member = await MemberModel.findById(memberId).select('_id')
      if (!member) {
        throw new ApiError(404, 'Member not found')
      }
      return this.list({
        page: 1,
        limit: 100,
        search: '',
        memberId,
        sortBy: 'startDate',
        sortOrder: 'desc',
      })
    },

    async summary() {
      await this.expireMemberships()
      const today = startOfUtcDay(now())
      const [active, expired, plans] = await Promise.all([
        MembershipModel.countDocuments({
          status: 'active',
          startDate: { $lte: today },
          expiryDate: { $gt: today },
        }),
        MembershipModel.countDocuments({ status: 'expired' }),
        MembershipPlanModel.countDocuments({ isActive: true }),
      ])
      return { activeMemberships: active, expiredMemberships: expired, activePlans: plans }
    },
  }
}
