import { randomBytes } from 'node:crypto'
import { ApiError } from '../../utils/ApiError.js'

const TRAINER_CODE_ATTEMPTS = 3

function createTrainerCode() {
  return `KGT-${randomBytes(6).toString('hex').toUpperCase()}`
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isTrainerCodeConflict(error) {
  return (
    error?.code === 11000 &&
    (error.keyPattern?.trainerCode === 1 || error.message?.includes('trainerCode'))
  )
}

export function createTrainerService({ TrainerModel, AuditLogModel }) {
  async function writeAudit({ actorId, action, trainer, previousData, changedFields, ipAddress }) {
    await new AuditLogModel({
      actor: actorId,
      action,
      module: 'trainers',
      entityId: trainer._id,
      previousData,
      newData: {
        trainerCode: trainer.trainerCode,
        status: trainer.status,
        ...(changedFields ? { changedFields } : {}),
      },
      ipAddress,
    }).save()
  }

  return {
    async create(input, actorId, ipAddress) {
      for (let attempt = 0; attempt < TRAINER_CODE_ATTEMPTS; attempt += 1) {
        const trainer = new TrainerModel({
          ...input,
          trainerCode: createTrainerCode(),
          status: 'active',
        })
        try {
          await trainer.save()
          await writeAudit({
            actorId,
            action: 'trainer.created',
            trainer,
            changedFields: Object.keys(input),
            ipAddress,
          })
          return trainer.toObject({ versionKey: false })
        } catch (error) {
          if (isTrainerCodeConflict(error) && attempt < TRAINER_CODE_ATTEMPTS - 1) {
            continue
          }
          if (isTrainerCodeConflict(error)) {
            throw new ApiError(409, 'Unable to allocate a unique trainer code')
          }
          throw error
        }
      }
      throw new ApiError(500, 'Unable to create trainer')
    },

    async list({ page, limit, search, status, sortBy, sortOrder }) {
      const filter = {}
      if (status) {
        filter.status = status
      }
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
        TrainerModel.find(filter)
          .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1, _id: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        TrainerModel.countDocuments(filter),
      ])
      return {
        trainers,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      }
    },

    async getById(trainerId) {
      const trainer = await TrainerModel.findById(trainerId).lean()
      if (!trainer) {
        throw new ApiError(404, 'Trainer not found')
      }
      return trainer
    },

    async update(trainerId, input, actorId, ipAddress) {
      const trainer = await TrainerModel.findById(trainerId)
      if (!trainer) {
        throw new ApiError(404, 'Trainer not found')
      }
      const previousData = {
        status: trainer.status,
        changedFields: Object.keys(input),
      }
      trainer.set(input)
      await trainer.save()
      await writeAudit({
        actorId,
        action: 'trainer.updated',
        trainer,
        previousData,
        changedFields: Object.keys(input),
        ipAddress,
      })
      return trainer.toObject({ versionKey: false })
    },

    async setStatus(trainerId, status, actorId, ipAddress) {
      const trainer = await TrainerModel.findById(trainerId)
      if (!trainer) {
        throw new ApiError(404, 'Trainer not found')
      }
      if (trainer.status === status) {
        return trainer.toObject({ versionKey: false })
      }
      const previousStatus = trainer.status
      trainer.status = status
      await trainer.save()
      await writeAudit({
        actorId,
        action: status === 'active' ? 'trainer.reactivated' : 'trainer.deactivated',
        trainer,
        previousData: { status: previousStatus },
        ipAddress,
      })
      return trainer.toObject({ versionKey: false })
    },
  }
}
