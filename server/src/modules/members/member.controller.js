import { AuditLog } from '../audit/auditLog.model.js'
import { Member } from './member.model.js'
import { ApiError } from '../../utils/ApiError.js'
import { sendSuccess } from '../../utils/ApiResponse.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { createMember, deleteMember } from './member.service.js'

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export const memberController = {
  create: asyncHandler(async (req, res) => {
    const member = await createMember(req.body, req.admin.id, req.ip)
    sendSuccess(res, { member }, 'Member created successfully', 201)
  }),

  list: asyncHandler(async (req, res) => {
    const { page, limit, search, status, sortBy, sortOrder } = req.validatedQuery
    const filter = {}
    if (status) filter.status = status
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i')
      filter.$or = [
        { memberCode: pattern },
        { fullName: pattern },
        { fatherName: pattern },
        { email: pattern },
        { phone: pattern },
      ]
    }

    const [members, total] = await Promise.all([
      Member.find(filter)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Member.countDocuments(filter),
    ])

    sendSuccess(
      res,
      { members, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
      'Members retrieved successfully',
    )
  }),

  getById: asyncHandler(async (req, res) => {
    const member = await Member.findById(req.validatedParams.memberId).lean()
    if (!member) {
      throw new ApiError(404, 'Member not found')
    }
    sendSuccess(res, { member }, 'Member retrieved successfully')
  }),

  update: asyncHandler(async (req, res) => {
    const member = await Member.findById(req.validatedParams.memberId)
    if (!member) {
      throw new ApiError(404, 'Member not found')
    }

    const previousStatus = member.status
    const changedFields = Object.keys(req.body)
    member.set(req.body)
    await member.save()
    await new AuditLog({
      actor: req.admin.id,
      action: 'member.updated',
      module: 'members',
      entityId: member._id,
      previousData: { status: previousStatus },
      newData: { status: member.status },
      metadata: { memberCode: member.memberCode, changedFields },
      ipAddress: req.ip,
    }).save()

    sendSuccess(
      res,
      { member: member.toObject({ versionKey: false }) },
      'Member updated successfully',
    )
  }),

  setStatus: asyncHandler(async (req, res) => {
    const member = await Member.findById(req.validatedParams.memberId)
    if (!member) {
      throw new ApiError(404, 'Member not found')
    }

    const status = req.body.status
    if (member.status !== status) {
      const previousStatus = member.status
      member.status = status
      await member.save()

      const action =
        status === 'active'
          ? 'member.reactivated'
          : 'member.deactivated'
      await new AuditLog({
        actor: req.admin.id,
        action,
        module: 'members',
        entityId: member._id,
        previousData: { status: previousStatus },
        newData: { status },
        metadata: { memberCode: member.memberCode, changedFields: ['status'] },
        ipAddress: req.ip,
      }).save()
    }

    sendSuccess(
      res,
      { member: member.toObject({ versionKey: false }) },
      'Member status updated successfully',
    )
  }),

  delete: asyncHandler(async (req, res) => {
    await deleteMember(req.validatedParams.memberId, req.admin.id, req.ip)
    sendSuccess(
      res,
      { memberId: req.validatedParams.memberId },
      'Member deleted permanently',
    )
  }),
}
