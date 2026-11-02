import { ApiError } from '../../utils/ApiError.js'

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function assignmentProjection() {
  return [
    { path: 'member', select: 'memberCode firstName lastName phone email status' },
    { path: 'trainer', select: 'trainerCode firstName lastName phone email status specialization' },
  ]
}

export function createAssignmentService({
  MemberModel,
  TrainerModel,
  AssignmentModel,
  AuditLogModel,
  now = () => new Date(),
}) {
  async function writeAudit({
    actorId,
    action,
    assignment,
    previousData,
    changedFields,
    ipAddress,
  }) {
    await new AuditLogModel({
      actor: actorId,
      action,
      module: 'trainerAssignments',
      entityId: assignment._id,
      previousData,
      newData: {
        status: assignment.status,
        startDate: assignment.startDate,
        ...(assignment.endDate ? { endDate: assignment.endDate } : {}),
        ...(changedFields ? { changedFields } : {}),
      },
      metadata: {
        memberId: assignment.member,
        trainerId: assignment.trainer,
      },
      ipAddress,
    }).save()
  }

  return {
    async create({ memberId, trainerId, startDate, proof, notes }, actorId, ipAddress) {
      const [member, trainer] = await Promise.all([
        MemberModel.findById(memberId).select('_id memberCode'),
        TrainerModel.findById(trainerId).select('_id trainerCode status'),
      ])
      if (!member) {
        throw new ApiError(404, 'Member not found')
      }
      if (!trainer) {
        throw new ApiError(404, 'Trainer not found')
      }
      if (trainer.status !== 'active') {
        throw new ApiError(409, 'Inactive trainers cannot receive new assignments')
      }
      let assignmentStartDate = startDate
      if (!assignmentStartDate) {
        const currentDate = now()
        assignmentStartDate = new Date(
          Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate()),
        )
      }
      const assignment = new AssignmentModel({
        member: member._id,
        trainer: trainer._id,
        startDate: assignmentStartDate,
        proof,
        notes,
        status: 'active',
      })
      await assignment.save()
      await writeAudit({
        actorId,
        action: 'trainerAssignment.created',
        assignment,
        changedFields: ['member', 'trainer', 'startDate', 'proof', ...(notes !== undefined ? ['notes'] : [])],
        ipAddress,
      })
      return assignment.toObject({ versionKey: false })
    },

    async list({ page, limit, search, memberId, trainerId, status, sortBy, sortOrder }) {
      const filter = {}
      if (memberId) filter.member = memberId
      if (trainerId) filter.trainer = trainerId
      if (status) filter.status = status
      if (search) {
        const pattern = new RegExp(escapeRegex(search), 'i')
        const [memberIds, trainerIds] = await Promise.all([
          MemberModel.find({
            $or: [
              { memberCode: pattern },
              { firstName: pattern },
              { lastName: pattern },
              { phone: pattern },
              { email: pattern },
            ],
          }).distinct('_id'),
          TrainerModel.find({
            $or: [
              { trainerCode: pattern },
              { firstName: pattern },
              { lastName: pattern },
              { phone: pattern },
              { email: pattern },
              { specialization: pattern },
            ],
          }).distinct('_id'),
        ])
        filter.$or = [
          { member: { $in: memberIds } },
          { trainer: { $in: trainerIds } },
        ]
      }

      const [assignments, total] = await Promise.all([
        AssignmentModel.find(filter)
          .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1, _id: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate(assignmentProjection())
          .lean(),
        AssignmentModel.countDocuments(filter),
      ])
      return {
        assignments,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      }
    },

    async getById(assignmentId) {
      const assignment = await AssignmentModel.findById(assignmentId)
        .populate(assignmentProjection())
        .lean()
      if (!assignment) {
        throw new ApiError(404, 'Trainer assignment not found')
      }
      return assignment
    },

    async end(assignmentId, endDate, actorId, ipAddress) {
      const current = await AssignmentModel.findById(assignmentId)
      if (!current) {
        throw new ApiError(404, 'Trainer assignment not found')
      }
      if (current.status !== 'active') {
        throw new ApiError(409, 'Trainer assignment has already ended')
      }
      if (endDate < current.startDate) {
        throw new ApiError(400, 'Assignment end date cannot precede its start date')
      }
      const assignment = await AssignmentModel.findOneAndUpdate(
        { _id: current._id, status: 'active' },
        { $set: { status: 'ended', endDate } },
        { new: true, runValidators: true },
      )
      if (!assignment) {
        throw new ApiError(409, 'Trainer assignment has already ended')
      }
      await writeAudit({
        actorId,
        action: 'trainerAssignment.ended',
        assignment,
        previousData: { status: current.status, endDate: current.endDate },
        changedFields: ['status', 'endDate'],
        ipAddress,
      })
      return assignment.toObject({ versionKey: false })
    },

    async listByMember(memberId, options) {
      const memberExists = await MemberModel.exists({ _id: memberId })
      if (!memberExists) {
        throw new ApiError(404, 'Member not found')
      }
      return this.list({ ...options, memberId })
    },

    async listByTrainer(trainerId, options) {
      const trainerExists = await TrainerModel.exists({ _id: trainerId })
      if (!trainerExists) {
        throw new ApiError(404, 'Trainer not found')
      }
      return this.list({ ...options, trainerId })
    },
  }
}
