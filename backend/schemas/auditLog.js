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
      required: true
    },
    entityType: {
      type: String,
      required: true
    },
    entityId: {
      type: String,
      default: null
    },
    severity: {
      type: String,
      enum: ['INFO', 'WARNING', 'CRITICAL'],
      default: 'INFO'
    },
    method: {
      type: String,
      default: null
    },
    url: {
      type: String,
      default: null
    },
    ipAddress: {
      type: String,
      default: null
    },
    userAgent: {
      type: String,
      default: null
    },
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED'],
      default: 'SUCCESS'
    },
    errorMessage: {
      type: String,
      default: null
    },
    executionDurationMs: {
      type: Number,
      default: null
    },
    payloadSize: {
      type: Number,
      default: null
    },
    payloadTruncated: {
      type: Boolean,
      default: false
    },
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

auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ farmId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, timestamp: -1 });
auditLogSchema.index({ severity: 1, timestamp: -1 });
auditLogSchema.index({ status: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

module.exports = auditLogSchema;
