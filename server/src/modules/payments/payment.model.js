import mongoose from 'mongoose'

export const paymentSchema = new mongoose.Schema(
  {
    transactionCode: {
      type: String,
      required: true,
      immutable: true,
      match: /^KGP-[A-F0-9]{16}$/,
    },
    idempotencyKey: {
      type: String,
      required: true,
      immutable: true,
      trim: true,
      maxlength: 128,
      select: false,
    },
    requestFingerprint: { type: String, required: true, immutable: true, select: false },
    type: {
      type: String,
      enum: ['payment', 'reversal'],
      required: true,
      default: 'payment',
      immutable: true,
    },
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
      immutable: true,
    },
    membership: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Membership',
      required: true,
      immutable: true,
    },
    amountPaise: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isSafeInteger,
      immutable: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi'],
      required: function paymentMethodRequired() {
        return this.type === 'payment'
      },
      immutable: true,
    },
    paymentDate: { type: Date, required: true, immutable: true },
    referenceNumber: { type: String, trim: true, maxlength: 100, immutable: true },
    notes: { type: String, trim: true, maxlength: 2000, immutable: true },
    status: {
      type: String,
      enum: ['completed', 'reversed'],
      required: true,
      default: 'completed',
    },
    reversedAmountPaise: {
      type: Number,
      min: 0,
      default: 0,
      validate: Number.isSafeInteger,
    },
    reversalOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      immutable: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
      immutable: true,
    },
  },
  {
    collection: 'payments',
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_document, result) {
        delete result.idempotencyKey
        delete result.requestFingerprint
        return result
      },
    },
    toObject: {
      transform(_document, result) {
        delete result.idempotencyKey
        delete result.requestFingerprint
        return result
      },
    },
  },
)

paymentSchema.index({ transactionCode: 1 }, { unique: true })
paymentSchema.index({ idempotencyKey: 1 }, { unique: true })
paymentSchema.index({ membership: 1, paymentDate: -1 })
paymentSchema.index({ member: 1, paymentDate: -1 })
paymentSchema.index({ reversalOf: 1, paymentDate: 1 })
paymentSchema.index({ status: 1, paymentDate: -1 })

paymentSchema.pre('validate', function validatePaymentShape() {
  if (this.type === 'payment' && this.reversalOf) {
    this.invalidate('reversalOf', 'Payment records cannot reference a reversed payment')
  }
  if (this.type === 'reversal' && !this.reversalOf) {
    this.invalidate('reversalOf', 'Reversal records must link to the original payment')
  }
  if (this.type === 'reversal' && this.paymentMethod) {
    this.invalidate('paymentMethod', 'Reversal records do not have a payment method')
  }
  if (this.type === 'reversal' && this.reversedAmountPaise !== 0) {
    this.invalidate('reversedAmountPaise', 'Only original payments track their cumulative reversal')
  }
})

export const Payment =
  mongoose.models.Payment ?? mongoose.model('Payment', paymentSchema)
