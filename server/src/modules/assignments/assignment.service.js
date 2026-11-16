import { ApiError } from '../../utils/ApiError.js'
import { TrainerAssignment } from './assignment.model.js'
import { AuditLog } from '../audit/auditLog.model.js'
import { Member } from '../members/member.model.js'
import { Trainer } from '../trainers/trainer.model.js'

async function writeAssignmentAudit(
  assignment,
  actorId,
  action,
  ipAddress,
  changedFields,
  previousData,
) {
  await new AuditLog({
    actor: actorId,
    action,
    module: 'trainerAssignments',
    entityId: assignment._id,
    ...(previousData ? { previousData } : {}),
    newData: {
      status: assignment.status,
      startDate: assignment.startDate,
      ...(assignment.endDate ? { endDate: assignment.endDate } : {}),
      changedFields,
    },
    metadata: {
      memberId: assignment.member,
      trainerId: assignment.trainer,
    },
    ipAddress,
  }).save()
}

export async function createAssignment(input, actorId, ipAddress) {
  const [member, trainer] = await Promise.all([
    Member.findById(input.memberId).select('_id memberCode fullName fatherName'),
    Trainer.findById(input.trainerId).select('_id status'),
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

  const currentDate = new Date()
  const startDate =
    input.startDate ??
    new Date(
      Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate()),
    )
  const assignment = new TrainerAssignment({
    member: member._id,
    memberSnapshot: {
      memberId: member._id,
      memberCode: member.memberCode,
      fullName: member.fullName,
      fatherName: member.fatherName,
    },
    trainer: trainer._id,
    startDate,
    proof: input.proof,
    notes: input.notes,
    status: 'active',
  })
  await assignment.save()
  await writeAssignmentAudit(
    assignment,
    actorId,
    'trainerAssignment.created',
    ipAddress,
    ['member', 'trainer', 'startDate', 'proof', ...(input.notes !== undefined ? ['notes'] : [])],
  )
  return assignment.toObject({ versionKey: false })
}

export async function endAssignment(assignmentId, endDate, actorId, ipAddress) {
  const current = await TrainerAssignment.findById(assignmentId)
  if (!current) {
    throw new ApiError(404, 'Trainer assignment not found')
  }
  if (current.status !== 'active') {
    throw new ApiError(409, 'Trainer assignment has already ended')
  }
  if (endDate < current.startDate) {
    throw new ApiError(400, 'Assignment end date cannot precede its start date')
  }

  const assignment = await TrainerAssignment.findOneAndUpdate(
    { _id: current._id, status: 'active' },
    { $set: { status: 'ended', endDate } },
    { new: true, runValidators: true },
  )
  if (!assignment) {
    throw new ApiError(409, 'Trainer assignment has already ended')
  }

  await writeAssignmentAudit(
    assignment,
    actorId,
    'trainerAssignment.ended',
    ipAddress,
    ['status', 'endDate'],
    { status: current.status, endDate: current.endDate },
  )
  return assignment.toObject({ versionKey: false })
}
