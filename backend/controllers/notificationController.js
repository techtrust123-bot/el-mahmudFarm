const mongoose = require('mongoose');
const authModel = require('../models/auth');
const { sendPrivateMessage } = require('../services/emailService');

const normalizeText = (value) => String(value || '').trim();

exports.getMyNotifications = async (req, res) => {
  const { Notification } = req.farmModels;
  const recipientUserId = String(req.user.id);
  const farmId = String(req.user.farmId);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);

  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipientUserId, farmId }).sort({ createdAt: -1 }).limit(limit).lean(),
      Notification.countDocuments({ recipientUserId, farmId, isRead: false }),
    ]);
    return res.json({ success: true, data: notifications, unreadCount });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load notifications.' });
  }
};

exports.markNotificationRead = async (req, res) => {
  const { Notification } = req.farmModels;
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientUserId: String(req.user.id), farmId: String(req.user.farmId) },
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found.' });
    return res.json({ success: true, data: notification });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update notification.' });
  }
};

exports.markAllNotificationsRead = async (req, res) => {
  const { Notification } = req.farmModels;
  await Notification.updateMany(
    { recipientUserId: String(req.user.id), farmId: String(req.user.farmId), isRead: false },
    { isRead: true }
  );
  return res.json({ success: true, message: 'Notifications marked as read.' });
};

exports.broadcastNotification = async (req, res) => {
  const { Notification } = req.farmModels;
  const title = normalizeText(req.body.title);
  const message = normalizeText(req.body.message);
  const type = normalizeText(req.body.type) || 'general';
  const target = normalizeText(req.body.target) || 'all';

  if (!title || !message || !['all'].includes(target)) {
    return res.status(400).json({ success: false, message: 'Title, message, and a valid target are required.' });
  }

  try {
    const users = await authModel.find({ farmId: String(req.user.farmId), isAccountVerified: { $ne: false } }).select('_id').lean();
    if (!users.length) return res.status(404).json({ success: false, message: 'No eligible users found.' });

    await Notification.insertMany(users.map((user) => ({
      recipientUserId: String(user._id), farmId: String(req.user.farmId), title, message, type,
    })));
    return res.status(201).json({ success: true, message: `Notification sent to ${users.length} users.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to broadcast notification.' });
  }
};

exports.sendPrivateUserMessage = async (req, res) => {
  const { Notification } = req.farmModels;
  const email = normalizeText(req.body.email).toLowerCase();
  const subject = normalizeText(req.body.subject);
  const message = normalizeText(req.body.message);
  if (!/^\S+@\S+\.\S+$/.test(email) || !subject || !message) {
    return res.status(400).json({ success: false, message: 'A valid email, subject, and message are required.' });
  }

  try {
    const user = await authModel.findOne({
      $expr: {
        $eq: [
          { $toLower: { $trim: { input: '$email' } } },
          email,
        ],
      },
    }).select('_id email farmId').lean();
    if (!user) return res.status(404).json({ success: false, message: 'No matching user found.' });

    const delivered = await sendPrivateMessage(user.email, subject, message);
    if (!delivered) return res.status(502).json({ success: false, message: 'Message could not be delivered.' });

    await Notification.create({
      recipientUserId: String(user._id), farmId: String(user.farmId), title: subject, message, type: 'private-message',
    });
    return res.status(201).json({ success: true, message: 'Private message sent.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to send private message.' });
  }
};
