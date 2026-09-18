const crypto = require('crypto');
const authModel = require('../models/auth');
const SupportConversation = require('../models/supportConversation');

const clean = (value, maxLength) => String(value || '').trim().slice(0, maxLength);
const isAdmin = (req) => req.user?.role === 'admin' || req.user?.userType === 'admin';
const userId = (req) => String(req.user.id);
const farmId = (req) => String(req.user.farmId);

const canSendMessage = (conversation) => {
  const recentMessages = conversation.messages.filter((item) => Date.now() - new Date(item.createdAt).getTime() < 60 * 1000);
  return recentMessages.length < 10;
};

exports.listMyConversations = async (req, res) => {
  const conversations = await SupportConversation.find({ userId: userId(req), farmId: farmId(req) })
    .select('-messages')
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();
  return res.json({ success: true, data: conversations });
};

exports.createConversation = async (req, res) => {
  const subject = clean(req.body.subject, 160);
  const message = clean(req.body.message, 4000);
  if (!subject || !message) return res.status(400).json({ success: false, message: 'Subject and message are required.' });

  const conversationId = `SUP-${crypto.randomUUID()}`;
  const now = new Date();
  const conversation = await SupportConversation.create({
    conversationId,
    userId: userId(req),
    farmId: farmId(req),
    subject,
    messages: [{ conversationId, senderId: userId(req), senderRole: 'user', message, createdAt: now }],
    lastMessage: message,
    lastMessageAt: now,
  });
  return res.status(201).json({ success: true, data: conversation });
};

exports.getConversation = async (req, res) => {
  const query = { conversationId: req.params.conversationId };
  if (!isAdmin(req)) Object.assign(query, { farmId: farmId(req), userId: userId(req) });
  const conversation = await SupportConversation.findOne(query).lean();
  if (!conversation) return res.status(404).json({ success: false, message: 'Support conversation not found.' });
  return res.json({ success: true, data: conversation });
};

exports.addMessage = async (req, res) => {
  const message = clean(req.body.message, 4000);
  if (!message) return res.status(400).json({ success: false, message: 'Message is required.' });

  const query = { conversationId: req.params.conversationId };
  if (!isAdmin(req)) Object.assign(query, { farmId: farmId(req), userId: userId(req) });
  const conversation = await SupportConversation.findOne(query);
  if (!conversation) return res.status(404).json({ success: false, message: 'Support conversation not found.' });
  if (conversation.status === 'closed') return res.status(409).json({ success: false, message: 'This conversation is closed.' });
  if (!canSendMessage(conversation)) return res.status(429).json({ success: false, message: 'Please wait before sending more messages.' });

  const senderRole = isAdmin(req) ? 'admin' : 'user';
  const now = new Date();
  conversation.messages.push({ conversationId: conversation.conversationId, senderId: userId(req), senderRole, message, createdAt: now });
  conversation.lastMessage = message;
  conversation.lastMessageAt = now;
  conversation.status = senderRole === 'user' ? 'open' : 'open';
  await conversation.save();
  return res.status(201).json({ success: true, data: conversation });
};

exports.listAdminConversations = async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
  const filter = isAdmin(req) ? {} : { farmId: farmId(req) };
  if (['open', 'resolved', 'closed'].includes(req.query.status)) filter.status = req.query.status;
  const [items, total] = await Promise.all([
    SupportConversation.find(filter).select('-messages').sort({ lastMessageAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    SupportConversation.countDocuments(filter),
  ]);
  const userQuery = { _id: { $in: items.map((item) => item.userId) } };
  if (!isAdmin(req)) userQuery.farmId = farmId(req);
  const users = await authModel.find(userQuery).select('_id name email farmId').lean();
  const usersById = new Map(users.map((user) => [String(user._id), user]));
  return res.json({ success: true, data: items.map((item) => ({ ...item, user: usersById.get(item.userId) || null })), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
};

exports.updateStatus = async (req, res) => {
  const status = clean(req.body.status, 20);
  if (!['open', 'resolved', 'closed'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid conversation status.' });
  const statusQuery = { conversationId: req.params.conversationId };
  if (!isAdmin(req)) statusQuery.farmId = farmId(req);
  const conversation = await SupportConversation.findOneAndUpdate(statusQuery, { status }, { new: true }).lean();
  if (!conversation) return res.status(404).json({ success: false, message: 'Support conversation not found.' });
  return res.json({ success: true, data: conversation });
};
