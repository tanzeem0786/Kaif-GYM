import { randomBytes } from 'node:crypto'
import { ApiError } from '../../utils/ApiError.js'
import { AuditLog } from '../audit/auditLog.model.js'
import { Member } from '../members/member.model.js'
import { Membership } from './models/membership.model.js'
import { MembershipPlan } from './models/membershipPlan.model.js'

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
  return `BAM-${randomBytes(8).toString('hex').toUpperCase()}`
}

function isDuplicateMembership(error) {
  return error?.code === 11000
}

async function writeAudit({ actorId, action, membership, previousData, newData, ipAddress }) {
  await new AuditLog({
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
  const plan = await MembershipPlan.findOne({ _id: planId, isActive: true })
  if (!plan) {
    if (!(await MembershipPlan.exists({ _id: planId }))) {
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
    const membership = new Membership({
      membershipCode: makeMembershipCode(),
      member: member._id,
      memberSnapshot: {
        memberId: member._id,
        memberCode: member.memberCode,
        fullName: member.fullName,
        fatherName: member.fatherName,
      },
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
      return membership.toObject({ versionKey: false })
    } catch (error) {
      if (error?.code === 11000 && error.keyPattern?.membershipCode === 1) {
        if (attempt < MEMBERSHIP_CODE_ATTEMPTS - 1) {
          continue
        }
        throw new ApiError(409, 'Unable to allocate a unique membership code')
      }
      if (isDuplicateMembership(error)) {
        throw new ApiError(409, 'A membership already exists in this renewal sequence')
      }
      throw error
    }
  }
}

export async function assignMembership({ memberId, planId, startDate }, actorId, ipAddress) {
  const member = await Member.findById(memberId)
  if (!member) {
    throw new ApiError(404, 'Member not found')
  }
  if (await Membership.exists({ member: member._id })) {
    throw new ApiError(409, 'This member already has membership history; use renewal')
  }
  const plan = await ensureActivePlan(planId)

  return createMembership({
    member,
    plan,
    startDate,
    actorId,
    ipAddress,
    action: 'membership.assigned',
  })
}

export async function renewMembership(membershipId, { planId, startDate }, actorId, ipAddress) {
  const previous = await Membership.findById(membershipId)
  if (!previous) {
    throw new ApiError(404, 'Membership not found')
  }
  if (previous.status === 'frozen' || previous.status === 'inactive') {
    throw new ApiError(409, 'This membership status does not allow renewal')
  }
  if (await Membership.exists({ renewalOf: previous._id })) {
    throw new ApiError(409, 'Only the latest membership in a renewal sequence can be renewed')
  }

  const [member, plan] = await Promise.all([
    Member.findById(previous.member),
    ensureActivePlan(planId),
  ])
  if (!member) {
    throw new ApiError(404, 'Member not found')
  }

  const today = startOfUtcDay(new Date())
  const requestedStart = startDate ?? today
  const start =
    previous.expiryDate > today
      ? previous.expiryDate
      : requestedStart > previous.expiryDate
        ? requestedStart
        : previous.expiryDate

  return createMembership({
    member,
    plan,
    startDate: start,
    renewalOf: previous._id,
    actorId,
    ipAddress,
    action: 'membership.renewed',
  })
}

export async function expireMemberships() {
  const today = startOfUtcDay(new Date())
  const expired = await Membership.find({
    status: 'active',
    expiryDate: { $lte: today },
  })
    .select('_id membershipCode member startDate expiryDate totalFeePaise status')
    .lean()
  let updatedCount = 0

  for (const previous of expired) {
    const membership = await Membership.findOneAndUpdate(
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
}
