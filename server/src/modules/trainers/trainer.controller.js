import { sendSuccess } from '../../utils/ApiResponse.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { createTrainerService } from './trainer.service.js'

export function createTrainerController({ TrainerModel, AuditLogModel }) {
  const service = createTrainerService({ TrainerModel, AuditLogModel })

  return {
    create: asyncHandler(async (req, res) => {
      const trainer = await service.create(req.body, req.admin.id, req.ip)
      sendSuccess(res, { trainer }, 'Trainer created successfully', 201)
    }),

    list: asyncHandler(async (req, res) => {
      const result = await service.list(req.validatedQuery)
      sendSuccess(res, result, 'Trainers retrieved successfully')
    }),

    getById: asyncHandler(async (req, res) => {
      const trainer = await service.getById(req.validatedParams.trainerId)
      sendSuccess(res, { trainer }, 'Trainer retrieved successfully')
    }),

    update: asyncHandler(async (req, res) => {
      const trainer = await service.update(
        req.validatedParams.trainerId,
        req.body,
        req.admin.id,
        req.ip,
      )
      sendSuccess(res, { trainer }, 'Trainer updated successfully')
    }),

    setStatus: asyncHandler(async (req, res) => {
      const trainer = await service.setStatus(
        req.validatedParams.trainerId,
        req.body.status,
        req.admin.id,
        req.ip,
      )
      sendSuccess(res, { trainer }, 'Trainer status updated successfully')
    }),
  }
}
