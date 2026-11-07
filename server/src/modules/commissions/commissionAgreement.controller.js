import { sendSuccess } from '../../utils/ApiResponse.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { createCommissionAgreementService } from './commissionAgreement.service.js'

export function createCommissionAgreementController(dependencies) {
  const service = createCommissionAgreementService(dependencies)

  return {
    createVersion: asyncHandler(async (req, res) => {
      const agreement = await service.createVersion(
        req.validatedParams.trainerId,
        req.body,
        req.admin.id,
        req.ip,
      )
      sendSuccess(res, { agreement }, 'Commission agreement version created', 201)
    }),

    listByTrainer: asyncHandler(async (req, res) => {
      const result = await service.listByTrainer(
        req.validatedParams.trainerId,
        req.validatedQuery,
      )
      sendSuccess(res, result, 'Commission agreement versions retrieved')
    }),

    getById: asyncHandler(async (req, res) => {
      const agreement = await service.getById(req.validatedParams.agreementId)
      sendSuccess(res, { agreement }, 'Commission agreement retrieved')
    }),
  }
}
