import mongoose from 'mongoose'

export const membershipPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
    durationMonths: { type: Number, required: true, enum: [1, 3, 6, 12] },
    pricePaise: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
    description: { type: String, trim: true, maxlength: 1000 },
    isActive: { type: Boolean, required: true, default: true },
  },
  { collection: 'membershipPlans', timestamps: true, versionKey: false },
)

membershipPlanSchema.index({ isActive: 1, durationMonths: 1 })
membershipPlanSchema.index({ name: 1 })

export const MembershipPlan =
  mongoose.models.MembershipPlan ??
  mongoose.model('MembershipPlan', membershipPlanSchema)
