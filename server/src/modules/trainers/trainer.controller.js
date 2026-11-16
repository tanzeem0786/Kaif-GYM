import { AuditLog } from '../audit/auditLog.model.js'
import { Trainer } from './trainer.model.js'
import { ApiError } from '../../utils/ApiError.js'
import { sendSuccess } from '../../utils/ApiResponse.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { createTrainer } from './trainer.service.js'

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export const trainerController = {
  create: asyncHandler(async (req, res) => {
    const trainer = await createTrainer(req.body, req.admin.id, req.ip)
    sendSuccess(res, { trainer }, 'Trainer created successfully', 201)
  }),

  list: asyncHandler(async (req, res) => {
    const { page, limit, search, status, sortBy, sortOrder } = req.validatedQuery
    const filter = {}
    if (status) filter.status = status
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i')
      filter.$or = [
        { trainerCode: pattern },
        { firstName: pattern },
        { lastName: pattern },
        { phone: pattern },
        { email: pattern },
        { specialization: pattern },
      ]
    }

    const [trainers, total] = await Promise.all([
      Trainer.find(filter)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Trainer.countDocuments(filter),
    ])

    sendSuccess(
      res,
      {
        trainers,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
      'Trainers retrieved successfully',
    )
  }),

  getById: asyncHandler(async (req, res) => {
    const trainer = await Trainer.findById(req.validatedParams.trainerId).lean()
    if (!trainer) {
      throw new ApiError(404, 'Trainer not found')
    }
    sendSuccess(res, { trainer }, 'Trainer retrieved successfully')
  }),

  update: asyncHandler(async (req, res) => {
    const trainer = await Trainer.findById(req.validatedParams.trainerId)
    if (!trainer) {
      throw new ApiError(404, 'Trainer not found')
    }

    const previousStatus = trainer.status
    const changedFields = Object.keys(req.body)
    trainer.set(req.body)
    await trainer.save()
    await new AuditLog({
      actor: req.admin.id,
      action: 'trainer.updated',
      module: 'trainers',
      entityId: trainer._id,
      previousData: { status: previousStatus, changedFields },
      newData: {
        trainerCode: trainer.trainerCode,
        status: trainer.status,
        changedFields,
      },
      ipAddress: req.ip,
    }).save()

    sendSuccess(
      res,
      { trainer: trainer.toObject({ versionKey: false }) },
      'Trainer updated successfully',
    )
  }),

  setStatus: asyncHandler(async (req, res) => {
    const trainer = await Trainer.findById(req.validatedParams.trainerId)
    if (!trainer) {
      throw new ApiError(404, 'Trainer not found')
    }

    const status = req.body.status
    if (trainer.status !== status) {
      const previousStatus = trainer.status
      trainer.status = status
      await trainer.save()
      await new AuditLog({
        actor: req.admin.id,
        action: status === 'active' ? 'trainer.reactivated' : 'trainer.deactivated',
        module: 'trainers',
        entityId: trainer._id,
        previousData: { status: previousStatus },
        newData: { trainerCode: trainer.trainerCode, status: trainer.status },
        ipAddress: req.ip,
      }).save()
    }

    sendSuccess(
      res,
      { trainer: trainer.toObject({ versionKey: false }) },
      'Trainer status updated successfully',
    )
  }),
}
