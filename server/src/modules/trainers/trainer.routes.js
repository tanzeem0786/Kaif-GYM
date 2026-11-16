import { Router } from 'express'
import { trainerController } from './trainer.controller.js'
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../../middlewares/requestValidation.js'
import {
  createTrainerSchema,
  trainerIdParamsSchema,
  trainerListQuerySchema,
  trainerStatusSchema,
  updateTrainerSchema,
} from './trainer.validation.js'

export function createTrainerRouter() {
  const router = Router()

  router
    .route('/')
    .get(validateQuery(trainerListQuerySchema), trainerController.list)
    .post(validateBody(createTrainerSchema), trainerController.create)
  router.patch(
    '/:trainerId/status',
    validateParams(trainerIdParamsSchema),
    validateBody(trainerStatusSchema),
    trainerController.setStatus,
  )
  router
    .route('/:trainerId')
    .get(validateParams(trainerIdParamsSchema), trainerController.getById)
    .patch(
      validateParams(trainerIdParamsSchema),
      validateBody(updateTrainerSchema),
      trainerController.update,
    )
  return router
}
