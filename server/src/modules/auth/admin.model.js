import bcrypt from 'bcrypt'
import mongoose from 'mongoose'

const SALT_ROUNDS = 12
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: emailPattern,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
      match: /^\$2[aby]\$\d\d\$[./A-Za-z0-9]{53}$/,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
    bootstrapKey: {
      type: String,
      default: 'owner',
      immutable: true,
      select: false,
      required: true,
      enum: ['owner'],
    },
  },
  { timestamps: true, versionKey: false },
)

adminSchema.index({ email: 1 }, { unique: true })
adminSchema.index({ bootstrapKey: 1 }, { unique: true })

adminSchema.methods.verifyPassword = function verifyPassword(password) {
  return bcrypt.compare(password, this.passwordHash)
}

adminSchema.statics.createWithPassword = async function createWithPassword({
  name,
  email,
  password,
}) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  const admin = new this({ name, email, passwordHash })
  await admin.save()
  return admin
}

export const Admin =
  mongoose.models.Admin ?? mongoose.model('Admin', adminSchema)
