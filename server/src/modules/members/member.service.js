import { ApiError } from '../../utils/ApiError.js'
import { TrainerAssignment } from '../assignments/assignment.model.js'
import { AuditLog } from '../audit/auditLog.model.js'
import { Membership } from '../memberships/models/membership.model.js'
import { Member } from './member.model.js'
import { Payment } from '../payments/payment.model.js'

const MEMBER_CODE_ATTEMPTS = 3
const MEMBER_CODE_PATTERN = /^BA\d{4}$/

function isMemberCodeConflict(error) {
  return (
    error?.code === 11000 &&
    (error.keyPattern?.memberCode === 1 || error.message?.includes('memberCode'))
  )
}

async function createMemberCode() {
  const [member, membership, payment, assignment] = await Promise.all([
    Member.findOne({ memberCode: MEMBER_CODE_PATTERN })
      .sort({ memberCode: -1 })
      .select('memberCode')
      .lean(),
    Membership.findOne({ 'memberSnapshot.memberCode': MEMBER_CODE_PATTERN })
      .sort({ 'memberSnapshot.memberCode': -1 })
      .select('memberSnapshot.memberCode')
      .lean(),
    Payment.findOne({ 'memberSnapshot.memberCode': MEMBER_CODE_PATTERN })
      .sort({ 'memberSnapshot.memberCode': -1 })
      .select('memberSnapshot.memberCode')
      .lean(),
    TrainerAssignment.findOne({ 'memberSnapshot.memberCode': MEMBER_CODE_PATTERN })
      .sort({ 'memberSnapshot.memberCode': -1 })
      .select('memberSnapshot.memberCode')
      .lean(),
  ])
  const latestNumber = [
    member?.memberCode,
    membership?.memberSnapshot?.memberCode,
    payment?.memberSnapshot?.memberCode,
    assignment?.memberSnapshot?.memberCode,
  ]
    .filter(Boolean)
    .reduce((latest, code) => Math.max(latest, Number(code.slice(2))), 0)
  const nextNumber = latestNumber + 1
  if (nextNumber > 9999) {
    throw new ApiError(409, 'Member code sequence is exhausted')
  }
  return `BA${String(nextNumber).padStart(4, '0')}`
}

export async function createMember(input, actorId, ipAddress) {
  let member

  for (let attempt = 0; attempt < MEMBER_CODE_ATTEMPTS; attempt += 1) {
    member = new Member({
      ...input,
      memberCode: await createMemberCode(),
      status: 'active',
    })

    try {
      await member.save()
      break
    } catch (error) {
      if (!isMemberCodeConflict(error)) {
        throw error
      }
      if (attempt === MEMBER_CODE_ATTEMPTS - 1) {
        throw new ApiError(409, 'Unable to allocate a unique member code')
      }
    }
  }

  await new AuditLog({
    actor: actorId,
    action: 'member.created',
    module: 'members',
    entityId: member._id,
    newData: { status: member.status },
    metadata: {
      memberCode: member.memberCode,
      changedFields: Object.keys(input),
    },
    ipAddress,
  }).save()

  return member.toObject({ versionKey: false })
}

export async function deleteMember(memberId, actorId, ipAddress) {
  const member = await Member.findById(memberId)
  if (!member) {
    throw new ApiError(404, 'Member not found')
  }

  const [activeMembership, activeAssignment] = await Promise.all([
    Membership.exists({ member: member._id, status: 'active' }),
    TrainerAssignment.exists({ member: member._id, status: 'active' }),
  ])
  if (activeMembership) {
    throw new ApiError(409, 'Cannot delete a member with an active membership. Resolve it first.')
  }
  if (activeAssignment) {
    throw new ApiError(409, 'Cannot delete a member with an active trainer assignment. End it first.')
  }

  const memberSnapshot = {
    memberId: member._id,
    memberCode: member.memberCode,
    fullName: member.fullName,
    fatherName: member.fatherName,
  }
  await Promise.all([
    Membership.updateMany({ member: member._id }, { $set: { memberSnapshot } }),
    Payment.updateMany({ member: member._id }, { $set: { memberSnapshot } }),
    TrainerAssignment.updateMany({ member: member._id }, { $set: { memberSnapshot } }),
  ])

  const result = await Member.deleteOne({ _id: member._id })
  if (!result.deletedCount) {
    throw new ApiError(404, 'Member not found')
  }

  await new AuditLog({
    actor: actorId,
    action: 'member.deleted',
    module: 'members',
    entityId: member._id,
    previousData: { status: member.status },
    newData: { deleted: true },
    metadata: { memberCode: member.memberCode },
    ipAddress,
  }).save()
}
