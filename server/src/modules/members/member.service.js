import { randomBytes } from 'node:crypto'
import { ApiError } from '../../utils/ApiError.js'

const MEMBER_CODE_ATTEMPTS = 3

function isMemberCodeConflict(error) {
  return (
    error?.code === 11000 &&
    (error.keyPattern?.memberCode === 1 || error.message?.includes('memberCode'))
  )
}

function createMemberCode() {
  return `KG-${randomBytes(6).toString('hex').toUpperCase()}`
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function toMemberData(member) {
  return member.toObject({ versionKey: false })
}

export function createMemberService({ MemberModel, AuditLogModel }) {
  async function writeAudit(
    { actorId, action, member, previousData, newData, changedFields, ipAddress },
  ) {
    const log = new AuditLogModel({
      actor: actorId,
      action,
      module: 'members',
      entityId: member._id,
      previousData,
      newData,
      metadata: {
        memberCode: member.memberCode,
        ...(changedFields ? { changedFields } : {}),
      },
      ipAddress,
    })
    await log.save()
  }

  return {
    async create(input, actorId, ipAddress) {
      for (let attempt = 0; attempt < MEMBER_CODE_ATTEMPTS; attempt += 1) {
        const member = new MemberModel({
          ...input,
          memberCode: createMemberCode(),
          status: 'active',
        })

        try {
          await member.save()
          await writeAudit({
            actorId,
            action: 'member.created',
            member,
            newData: { status: member.status },
            changedFields: Object.keys(input),
            ipAddress,
          })
          return toMemberData(member)
        } catch (error) {
          if (isMemberCodeConflict(error) && attempt < MEMBER_CODE_ATTEMPTS - 1) {
            continue
          }
          if (isMemberCodeConflict(error)) {
            throw new ApiError(409, 'Unable to allocate a unique member code')
          }
          throw error
        }
      }

      throw new ApiError(500, 'Unable to create member')
    },

    async list({ page, limit, search, status, sortBy, sortOrder }) {
      const filter = {}
      if (status) {
        filter.status = status
      }
      if (search) {
        const pattern = new RegExp(escapeRegex(search), 'i')
        filter.$or = [
          { memberCode: pattern },
          { firstName: pattern },
          { lastName: pattern },
          { email: pattern },
          { phone: pattern },
        ]
      }

      const skip = (page - 1) * limit
      const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1, _id: 1 }
      const [members, total] = await Promise.all([
        MemberModel.find(filter).sort(sort).skip(skip).limit(limit).lean(),
        MemberModel.countDocuments(filter),
      ])

      return {
        members,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    },

    async getById(memberId) {
      const member = await MemberModel.findById(memberId).lean()
      if (!member) {
        throw new ApiError(404, 'Member not found')
      }
      return member
    },

    async update(memberId, input, actorId, ipAddress) {
      const member = await MemberModel.findById(memberId)
      if (!member) {
        throw new ApiError(404, 'Member not found')
      }

      const previousData = { status: member.status }
      for (const [field, value] of Object.entries(input)) {
        member.set(field, value)
      }
      await member.save()
      await writeAudit({
        actorId,
        action: 'member.updated',
        member,
        previousData,
        newData: { status: member.status },
        changedFields: Object.keys(input),
        ipAddress,
      })
      return toMemberData(member)
    },

    async setStatus(memberId, status, actorId, ipAddress) {
      const member = await MemberModel.findById(memberId)
      if (!member) {
        throw new ApiError(404, 'Member not found')
      }

      if (member.status === status) {
        return toMemberData(member)
      }

      const previousStatus = member.status
      member.status = status
      await member.save()
      const action =
        status === 'active'
          ? 'member.reactivated'
          : status === 'inactive'
            ? 'member.deactivated'
            : 'member.archived'
      await writeAudit({
        actorId,
        action,
        member,
        previousData: { status: previousStatus },
        newData: { status },
        changedFields: ['status'],
        ipAddress,
      })
      return toMemberData(member)
    },
  }
}
