import mongoose from 'mongoose'

export const commissionAgreementSchema = new mongoose.Schema(
  {
    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer',
      required: true,
      immutable: true,
    },
    agreementVersion: { type: Number, required: true, min: 1, immutable: true },
    commissionBasis: {
      type: String,
      required: true,
      enum: ['membership_fee', 'received_payment'],
      immutable: true,
    },
    effectiveFrom: { type: Date, required: true, immutable: true },
    effectiveTo: { type: Date, immutable: true },
  },
  {
    collection: 'commissionAgreements',
    timestamps: true,
    versionKey: false,
  },
)

commissionAgreementSchema.index(
  { trainer: 1, agreementVersion: 1 },
  { unique: true },
)
commissionAgreementSchema.index({ trainer: 1, effectiveFrom: -1 })

commissionAgreementSchema.pre('save', function preventAgreementUpdates() {
  if (!this.isNew) {
    throw new Error('Commission agreement versions are immutable')
  }
})

commissionAgreementSchema.pre(
  'deleteOne',
  { document: true, query: false },
  function preventDocumentAgreementDeletion() {
    throw new Error('Commission agreement versions are immutable')
  },
)

for (const operation of [
  'deleteMany',
  'deleteOne',
  'findOneAndDelete',
  'findOneAndReplace',
  'findOneAndUpdate',
  'replaceOne',
  'updateMany',
  'updateOne',
]) {
  commissionAgreementSchema.pre(operation, function preventAgreementMutation() {
    throw new Error('Commission agreement versions are immutable')
  })
}

export const CommissionAgreement =
  mongoose.models.CommissionAgreement ??
  mongoose.model('CommissionAgreement', commissionAgreementSchema)
