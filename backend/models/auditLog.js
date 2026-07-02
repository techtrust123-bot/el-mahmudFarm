const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    farmId: {
      type: String,
      required: true
    },
    action: {
      type: String,
      enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'BACKUP', 'VIEW'],
      required: true
    },
    entityType: {
      type: String,
      enum: ['livestock', 'poultry', 'feed', 'sales', 'expense', 'staff', 'user'],
      required: true
    },
    entityId: {
      type: String,
      default: null
    },
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed
    },
    ipAddress: String,
    userAgent: String,
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED'],
      default: 'SUCCESS'
    },
    errorMessage: String,
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    collection: 'auditLogs',
    timestamps: false
  }
);

// Indexes for faster querying
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ farmId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
