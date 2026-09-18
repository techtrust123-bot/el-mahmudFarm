const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientUserId: { type: String, required: true, index: true },
  farmId: { type: String, required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  message: { type: String, required: true, trim: true, maxlength: 4000 },
  type: { type: String, required: true, trim: true, default: 'general', maxlength: 40 },
  isRead: { type: Boolean, default: false, index: true },
}, { timestamps: true });

notificationSchema.index({ recipientUserId: 1, farmId: 1, createdAt: -1 });

module.exports = notificationSchema;
