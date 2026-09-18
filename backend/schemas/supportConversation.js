const mongoose = require('mongoose');

const supportMessageSchema = new mongoose.Schema({
  conversationId: { type: String, required: true },
  senderId: { type: String, required: true },
  senderRole: { type: String, enum: ['user', 'admin'], required: true },
  message: { type: String, required: true, trim: true, maxlength: 4000 },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const supportConversationSchema = new mongoose.Schema({
  conversationId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  farmId: { type: String, required: true, index: true },
  subject: { type: String, required: true, trim: true, maxlength: 160 },
  status: { type: String, enum: ['open', 'resolved', 'closed'], default: 'open', index: true },
  messages: { type: [supportMessageSchema], default: [] },
  lastMessage: { type: String, default: '' },
  lastMessageAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

supportConversationSchema.index({ farmId: 1, userId: 1, updatedAt: -1 });
supportConversationSchema.index({ farmId: 1, status: 1, lastMessageAt: -1 });

module.exports = supportConversationSchema;
