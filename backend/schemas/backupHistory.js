const mongoose = require('mongoose');

/**
 * BackupHistory schema
 * Records metadata for each backup run produced by the scheduled job or manual trigger.
 */
const backupHistorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  path: { type: String, required: true },
  status: { type: String, enum: ['PENDING','RUNNING','SUCCESS','FAILED','CLEANED'], default: 'PENDING' },
  targetType: { type: String, enum: ['main','farm','all-farms','multiple'], default: 'main' },
  farmId: { type: String, default: null },
  databases: { type: [String], default: [] },
  collections: { type: Object, default: {} },
  durationMs: { type: Number, default: 0 },
  sizeBytes: { type: Number, default: 0 },
  compressedBytes: { type: Number, default: 0 },
  checksum: { type: String, default: null },
  mongodbVersion: { type: String, default: null },
  error: { type: Object, default: null },
  createdAt: { type: Date, default: Date.now },
  finishedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = backupHistorySchema;
