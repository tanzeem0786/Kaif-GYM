import { randomBytes } from 'node:crypto'
import { ApiError } from '../../utils/ApiError.js'
import { AuditLog } from '../audit/auditLog.model.js'
import { Trainer } from './trainer.model.js'

const TRAINER_CODE_ATTEMPTS = 3

function createTrainerCode() {
  return `BAT-${randomBytes(6).toString('hex').toUpperCase()}`
}

function isTrainerCodeConflict(error) {
  return (
    error?.code === 11000 &&
    (error.keyPattern?.trainerCode === 1 || error.message?.includes('trainerCode'))
  )
}

export async function createTrainer(input, actorId, ipAddress) {
  let trainer

  for (let attempt = 0; attempt < TRAINER_CODE_ATTEMPTS; attempt += 1) {
    trainer = new Trainer({
      ...input,
      trainerCode: createTrainerCode(),
      status: 'active',
    })

    try {
      await trainer.save()
      break
    } catch (error) {
      if (!isTrainerCodeConflict(error)) {
        throw error
      }
      if (attempt === TRAINER_CODE_ATTEMPTS - 1) {
        throw new ApiError(409, 'Unable to allocate a unique trainer code')
      }
    }
  }

  await new AuditLog({
    actor: actorId,
    action: 'trainer.created',
    module: 'trainers',
    entityId: trainer._id,
    newData: {
      trainerCode: trainer.trainerCode,
      status: trainer.status,
      changedFields: Object.keys(input),
    },
    ipAddress,
  }).save()

  return trainer.toObject({ versionKey: false })
}
