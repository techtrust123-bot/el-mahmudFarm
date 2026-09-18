const express = require('express');
const { authMiddleware, isAdmin } = require('../middleweres/authMiddlewere');
const { checkSubscription } = require('../middleware/subscriptionMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');
const { auditMiddleware } = require('../middleware/auditLogger');
const {
  listMyConversations,
  createConversation,
  getConversation,
  addMessage,
  listAdminConversations,
  updateStatus,
} = require('../controllers/supportController');

const router = express.Router();
const secured = [authMiddleware, checkSubscription];

router.get('/conversations', ...secured, asyncHandler(listMyConversations));
router.post('/conversations', ...secured, asyncHandler(createConversation));
router.get('/conversations/:conversationId', ...secured, asyncHandler(getConversation));
router.post('/conversations/:conversationId/messages', ...secured, asyncHandler(addMessage));
router.get('/admin/conversations', ...secured, isAdmin, asyncHandler(listAdminConversations));
router.patch('/admin/conversations/:conversationId/status', ...secured, isAdmin, auditMiddleware('UPDATE_SUPPORT_STATUS', 'support-conversation'), asyncHandler(updateStatus));
router.post('/admin/conversations/:conversationId/messages', ...secured, isAdmin, auditMiddleware('REPLY_SUPPORT_CONVERSATION', 'support-conversation'), asyncHandler(addMessage));

module.exports = router;
