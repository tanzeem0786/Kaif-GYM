import { ApiError } from '../../utils/ApiError.js'
import { AuditLog } from '../audit/auditLog.model.js'
import { CommissionAgreement } from './commissionAgreement.model.js'
import { Trainer } from '../trainers/trainer.model.js'

function isVersionConflict(error) {
  return (
    error?.code === 11000 &&
    (error.keyPattern?.agreementVersion === 1 ||
      error.message?.includes('agreementVersion'))
  )
}

export async function createCommissionAgreementVersion(
  trainerId,
  input,
  actorId,
  ipAddress,
) {
  const trainer = await Trainer.findById(trainerId).select('_id')
  if (!trainer) {
    throw new ApiError(404, 'Trainer not found')
  }

  const latestVersion = await CommissionAgreement.findOne({ trainer: trainerId })
    .sort({ agreementVersion: -1 })
    .select('agreementVersion')
    .lean()
  const agreement = new CommissionAgreement({
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

  await new AuditLog({
    actor: actorId,
    action: 'commissionAgreement.created',
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

  return agreement.toObject({ versionKey: false })
}
