import { ApiError } from '../../utils/ApiError.js'
import { sendSuccess } from '../../utils/ApiResponse.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { TrainerAssignment } from './assignment.model.js'
import { Member } from '../members/member.model.js'
import { Trainer } from '../trainers/trainer.model.js'
import { createAssignment, endAssignment } from './assignment.service.js'

const assignmentPopulation = [
  { path: 'member', select: 'memberCode fullName fatherName phone email status' },
  { path: 'trainer', select: 'trainerCode firstName lastName phone email status specialization' },
]

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function listAssignments(options) {
  const { page, limit, search, memberId, trainerId, status, sortBy, sortOrder } = options
  const filter = {}
  if (memberId) filter.member = memberId
  if (trainerId) filter.trainer = trainerId
  if (status) filter.status = status

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i')
    const [memberIds, trainerIds, snapshotAssignmentIds] = await Promise.all([
      Member.find({
        $or: [
          { memberCode: pattern },
          { fullName: pattern },
          { fatherName: pattern },
          { phone: pattern },
          { email: pattern },
        ],
      }).distinct('_id'),
      Trainer.find({
        $or: [
          { trainerCode: pattern },
          { firstName: pattern },
          { lastName: pattern },
          { phone: pattern },
          { email: pattern },
          { specialization: pattern },
        ],
      }).distinct('_id'),
      TrainerAssignment.find({
        $or: [
          { 'memberSnapshot.memberCode': pattern },
          { 'memberSnapshot.fullName': pattern },
          { 'memberSnapshot.fatherName': pattern },
        ],
      }).distinct('_id'),
    ])
    filter.$or = [
      { member: { $in: memberIds } },
      { trainer: { $in: trainerIds } },
      { _id: { $in: snapshotAssignmentIds } },
    ]
  }

  const [assignments, total] = await Promise.all([
    TrainerAssignment.find(filter)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(assignmentPopulation)
      .lean(),
    TrainerAssignment.countDocuments(filter),
  ])
  return {
    assignments,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

export const assignmentController = {
  create: asyncHandler(async (req, res) => {
    const assignment = await createAssignment(req.body, req.admin.id, req.ip)
    sendSuccess(res, { assignment }, 'Trainer assigned successfully', 201)
  }),

  list: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await listAssignments(req.validatedQuery),
      'Trainer assignments retrieved successfully',
    )
  }),

  listByMember: asyncHandler(async (req, res) => {
    const { memberId } = req.validatedParams
    const [memberExists, historyExists] = await Promise.all([
      Member.exists({ _id: memberId }),
      TrainerAssignment.exists({ member: memberId }),
    ])
    if (!memberExists && !historyExists) {
      throw new ApiError(404, 'Member not found')
    }

    sendSuccess(
      res,
      await listAssignments({ ...req.validatedQuery, memberId }),
      'Member trainer assignments retrieved successfully',
    )
  }),

  listByTrainer: asyncHandler(async (req, res) => {
    const { trainerId } = req.validatedParams
    if (!(await Trainer.exists({ _id: trainerId }))) {
      throw new ApiError(404, 'Trainer not found')
    }
    sendSuccess(
      res,
      await listAssignments({ ...req.validatedQuery, trainerId }),
      'Trainer assignment history retrieved successfully',
    )
  }),

  getById: asyncHandler(async (req, res) => {
    const assignment = await TrainerAssignment.findById(req.validatedParams.assignmentId)
      .populate(assignmentPopulation)
      .lean()
    if (!assignment) {
      throw new ApiError(404, 'Trainer assignment not found')
    }
    sendSuccess(res, { assignment }, 'Trainer assignment retrieved successfully')
  }),

  end: asyncHandler(async (req, res) => {
    const assignment = await endAssignment(
      req.validatedParams.assignmentId,
      req.body.endDate,
      req.admin.id,
      req.ip,
    )
    sendSuccess(res, { assignment }, 'Trainer assignment ended successfully')
  }),
}
