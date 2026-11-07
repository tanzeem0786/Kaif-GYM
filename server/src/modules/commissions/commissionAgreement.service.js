import { ApiError } from '../../utils/ApiError.js'

function isVersionConflict(error) {
  return (
    error?.code === 11000 &&
    (error.keyPattern?.agreementVersion === 1 ||
      error.message?.includes('agreementVersion'))
  )
}

export function createCommissionAgreementService({
  TrainerModel,
  CommissionAgreementModel,
  AuditLogModel,
}) {
  async function writeAudit({ actorId, action, agreement, ipAddress }) {
    await new AuditLogModel({
      actor: actorId,
      action,
      module: 'commissions',
      entityId: agreement._id,
      newData: {
        trainer: agreement.trainer,
        agreementVersion: agreement.agreementVersion,
        commissionBasis: agreement.commissionBasis,
        effectiveFrom: agreement.effectiveFrom,
        ...(agreement.effectiveTo ? { effectiveTo: agreement.effectiveTo } : {}),
      },
      metadata: { trainerId: agreement.trainer },
      ipAddress,
    }).save()
  }

  return {
    async createVersion(trainerId, input, actorId, ipAddress) {
      const trainer = await TrainerModel.findById(trainerId).select('_id')
      if (!trainer) {
        throw new ApiError(404, 'Trainer not found')
      }

      const latestVersion = await CommissionAgreementModel.findOne({ trainer: trainerId })
        .sort({ agreementVersion: -1 })
        .select('agreementVersion')
        .lean()
      const agreement = new CommissionAgreementModel({
        trainer: trainerId,
        agreementVersion: (latestVersion?.agreementVersion ?? 0) + 1,
        ...input,
      })

      try {
        await agreement.save()
      } catch (error) {
        if (isVersionConflict(error)) {
          throw new ApiError(
            409,
            'A commission agreement version was created concurrently. Reload and retry.',
          )
        }
        throw error
      }

      await writeAudit({
        actorId,
        action: 'commissionAgreement.created',
        agreement,
        ipAddress,
      })
      return agreement.toObject({ versionKey: false })
    },

    async listByTrainer(trainerId, { page, limit }) {
      const trainer = await TrainerModel.exists({ _id: trainerId })
      if (!trainer) {
        throw new ApiError(404, 'Trainer not found')
      }
      const filter = { trainer: trainerId }
      const [agreements, total] = await Promise.all([
        CommissionAgreementModel.find(filter)
          .sort({ agreementVersion: -1, _id: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        CommissionAgreementModel.countDocuments(filter),
      ])
      return {
        agreements,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      }
    },

    async getById(agreementId) {
      const agreement = await CommissionAgreementModel.findById(agreementId)
        .populate({ path: 'trainer', select: 'trainerCode firstName lastName status' })
        .lean()
      if (!agreement) {
        throw new ApiError(404, 'Commission agreement not found')
      }
      return agreement
    },
  }
}
