import mongoose from 'mongoose'

const planSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    durationMonths: { type: Number, required: true, enum: [1, 3, 6, 12] },
    pricePaise: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  },
  { _id: false },
)

const memberSnapshotSchema = new mongoose.Schema(
  {
    memberId: { type: mongoose.Schema.Types.ObjectId, required: true },
    memberCode: { type: String, required: true },
    fullName: { type: String, required: true },
    fatherName: { type: String, required: true },
  },
  { _id: false },
)

export const membershipSchema = new mongoose.Schema(
  {
    membershipCode: {
      type: String,
      required: true,
      immutable: true,
      match: /^BAM-[A-F0-9]{16}$/,
    },
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
      immutable: true,
    },
    memberSnapshot: { type: memberSnapshotSchema },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MembershipPlan',
      required: true,
      immutable: true,
    },
    planSnapshot: { type: planSnapshotSchema, required: true, immutable: true },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    originalExpiryDate: { type: Date, required: true },
    totalFeePaise: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
    amountPaidPaise: { type: Number, required: true, min: 0, default: 0, validate: Number.isSafeInteger },
    outstandingBalancePaise: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
    status: {
      type: String,
      required: true,
      enum: ['active', 'expired', 'inactive', 'frozen'],
      default: 'active',
    },
    renewalOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Membership',
      immutable: true,
    },
  },
  { collection: 'memberships', timestamps: true, versionKey: false },
)

membershipSchema.index({ membershipCode: 1 }, { unique: true })
membershipSchema.index({ member: 1, startDate: 1 })
membershipSchema.index({ status: 1, expiryDate: 1 })
membershipSchema.index({ expiryDate: 1 })
membershipSchema.index({ member: 1, renewalOf: 1 }, { unique: true })

export const Membership =
  mongoose.models.Membership ?? mongoose.model('Membership', membershipSchema)
