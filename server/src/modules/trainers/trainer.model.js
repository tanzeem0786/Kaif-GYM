import mongoose from 'mongoose'

export const trainerSchema = new mongoose.Schema(
  {
    trainerCode: {
      type: String,
      required: true,
      immutable: true,
      match: /^BAT-[A-F0-9]{12}$/,
    },
    firstName: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
    lastName: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 16 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    profileImage: { type: String, trim: true, maxlength: 2048 },
    specialization: [{ type: String, trim: true, minlength: 1, maxlength: 100 }],
    joiningDate: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      required: true,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    notes: { type: String, trim: true, maxlength: 2000 },
  },
  { collection: 'trainers', timestamps: true, versionKey: false },
)

trainerSchema.index({ trainerCode: 1 }, { unique: true })
trainerSchema.index({ status: 1 })

export const Trainer =
  mongoose.models.Trainer ?? mongoose.model('Trainer', trainerSchema)
