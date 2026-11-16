import mongoose from 'mongoose'

const proofSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    fileName: { type: String, required: true, trim: true, maxlength: 255 },
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

export const trainerAssignmentSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
      immutable: true,
    },
    memberSnapshot: { type: memberSnapshotSchema },
    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer',
      required: true,
      immutable: true,
    },
    startDate: { type: Date, required: true, immutable: true },
    endDate: { type: Date },
    status: {
      type: String,
      required: true,
      enum: ['active', 'ended'],
      default: 'active',
    },
    proof: { type: proofSchema, required: true, immutable: true },
    notes: { type: String, trim: true, maxlength: 2000 },
  },
  { collection: 'trainerAssignments', timestamps: true, versionKey: false },
)

trainerAssignmentSchema.index({ member:  1, status: 1 })
trainerAssignmentSchema.index({ trainer: 1, status: 1 })
trainerAssignmentSchema.index({ member: 1, startDate: -1 })
trainerAssignmentSchema.index({ trainer: 1, startDate: -1 })

export const TrainerAssignment =
  mongoose.models.TrainerAssignment ??
  mongoose.model('TrainerAssignment', trainerAssignmentSchema)
