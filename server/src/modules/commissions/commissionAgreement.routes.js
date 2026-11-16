import { Router } from 'express'
import { commissionAgreementController } from './commissionAgreement.controller.js'
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../../middlewares/requestValidation.js'
import {
  commissionAgreementIdParamsSchema,
  commissionAgreementListQuerySchema,
  commissionAgreementTrainerParamsSchema,
  createCommissionAgreementSchema,
} from './commissionAgreement.validation.js'

export function createCommissionAgreementRouter() {
  const router = Router()

  router
    .route('/trainers/:trainerId')
    .get(
      validateParams(commissionAgreementTrainerParamsSchema),
      validateQuery(commissionAgreementListQuerySchema),
      commissionAgreementController.listByTrainer,
    )
    .post(
      validateParams(commissionAgreementTrainerParamsSchema),
      validateBody(createCommissionAgreementSchema),
      commissionAgreementController.createVersion,
    )
  router.get(
    '/:agreementId',
    validateParams(commissionAgreementIdParamsSchema),
    commissionAgreementController.getById,
  )
  return router
}
