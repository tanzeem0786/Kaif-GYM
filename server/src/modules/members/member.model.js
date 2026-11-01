import mongoose from 'mongoose'

const addressSchema = new mongoose.Schema(
  {
    text: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false },
)

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 16 },
  },
  { _id: false },
)

export const memberSchema = new mongoose.Schema(
  {
    memberCode: {
      type: String,
      required: true,
      immutable: true,
      match: /^KG-[A-F0-9]{12}$/,
    },
    firstName: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
    lastName: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 16 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    gender: { type: String, trim: true, maxlength: 50 },
    dateOfBirth: { type: Date },
    address: { type: addressSchema },
    profileImage: { type: String, trim: true, maxlength: 2048 },
    emergencyContact: { type: emergencyContactSchema },
    registrationDate: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      required: true,
      enum: ['active', 'inactive', 'archived'],
      default: 'active',
    },
    notes: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true, versionKey: false },
)

memberSchema.index({ memberCode: 1 }, { unique: true })
memberSchema.index({ phone: 1 })
memberSchema.index({ status: 1 })

export const Member =
  mongoose.models.Member ?? mongoose.model('Member', memberSchema)
