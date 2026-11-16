import { ApiError } from '../../utils/ApiError.js'
import { sendSuccess } from '../../utils/ApiResponse.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { CommissionAgreement } from './commissionAgreement.model.js'
import { Trainer } from '../trainers/trainer.model.js'
import { createCommissionAgreementVersion } from './commissionAgreement.service.js'

export const commissionAgreementController = {
  createVersion: asyncHandler(async (req, res) => {
    const agreement = await createCommissionAgreementVersion(
      req.validatedParams.trainerId,
      req.body,
      req.admin.id,
      req.ip,
    )
    sendSuccess(res, { agreement }, 'Commission agreement version created', 201)
  }),

  listByTrainer: asyncHandler(async (req, res) => {
    const { trainerId } = req.validatedParams
    const { page, limit } = req.validatedQuery
    if (!(await Trainer.exists({ _id: trainerId }))) {
      throw new ApiError(404, 'Trainer not found')
    }

    const filter = { trainer: trainerId }
    const [agreements, total] = await Promise.all([
      CommissionAgreement.find(filter)
        .sort({ agreementVersion: -1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CommissionAgreement.countDocuments(filter),
    ])
    sendSuccess(
      res,
      {
        agreements,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
      'Commission agreement versions retrieved',
    )
  }),

  getById: asyncHandler(async (req, res) => {
    const agreement = await CommissionAgreement.findById(req.validatedParams.agreementId)
      .populate({ path: 'trainer', select: 'trainerCode firstName lastName status' })
      .lean()
    if (!agreement) {
      throw new ApiError(404, 'Commission agreement not found')
    }
    sendSuccess(res, { agreement }, 'Commission agreement retrieved')
  }),
}
