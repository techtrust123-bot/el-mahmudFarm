const express = require('express');
const { authMiddleware, isAdmin } = require('../middleweres/authMiddlewere');
const { checkSubscription } = require('../middleware/subscriptionMiddleware');
const { attachFarmDB } = require('../middleware/dbMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');
const { auditMiddleware } = require('../middleware/auditLogger');
const {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  broadcastNotification,
  sendPrivateUserMessage,
} = require('../controllers/notificationController');

const router = express.Router();
const secured = [authMiddleware, checkSubscription, attachFarmDB];

router.get('/', ...secured, asyncHandler(getMyNotifications));
router.patch('/:id/read', ...secured, asyncHandler(markNotificationRead));
router.patch('/read-all', ...secured, asyncHandler(markAllNotificationsRead));
router.post('/admin/broadcast', ...secured, isAdmin, auditMiddleware('BROADCAST_NOTIFICATION', 'notification'), asyncHandler(broadcastNotification));
router.post('/admin/private-message', ...secured, isAdmin, auditMiddleware('SEND_PRIVATE_MESSAGE', 'notification'), asyncHandler(sendPrivateUserMessage));

module.exports = router;
