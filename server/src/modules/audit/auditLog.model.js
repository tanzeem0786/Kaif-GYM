import mongoose from 'mongoose'

export const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    actorType: { type: String, enum: ['admin', 'system'], default: 'admin', required: true },
    action: { type: String, required: true, trim: true },
    module: { type: String, required: true, trim: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    previousData: { type: mongoose.Schema.Types.Mixed },
    newData: { type: mongoose.Schema.Types.Mixed },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: { type: String, trim: true, maxlength: 100 },
  },
  {
    collection: 'auditLogs',
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
)

auditLogSchema.index({ module: 1, createdAt: -1 })
auditLogSchema.index({ entityId: 1, createdAt: -1 })

auditLogSchema.pre('save', function preventAuditLogUpdates() {
  if (!this.isNew) {
    throw new Error('Audit logs are append-only')
  }
})

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
  auditLogSchema.pre(operation, function preventAuditLogMutation() {
    throw new Error('Audit logs are append-only')
  })
}

export const AuditLog =
  mongoose.models.AuditLog ?? mongoose.model('AuditLog', auditLogSchema)
