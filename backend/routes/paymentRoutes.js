const express = require('express')
const router = express.Router()
const { authMiddleware, isAdmin } = require('../middleweres/authMiddlewere')
const { asyncHandler } = require('../middleware/errorHandler')
const {
  initializePayment,
  initializeUpgrade,
  verifyPayment,
  webhook,
  getSubscriptionStatus,
  getPaymentHistory,
  getAdminSubscriptions,
  getAdminSubscriptionStats,
  getAdminRevenueAnalytics,
  cancelAdminSubscription,
} = require('../controllers/paymentController')

router.post('/webhook', asyncHandler(webhook))
router.post('/initialize', authMiddleware, asyncHandler(initializePayment))
router.post('/upgrade', authMiddleware, asyncHandler(initializeUpgrade))
router.get('/verify/:reference', authMiddleware, asyncHandler(verifyPayment))
router.get('/status', authMiddleware, asyncHandler(getSubscriptionStatus))
router.get('/history', authMiddleware, asyncHandler(getPaymentHistory))
router.get('/admin/subscriptions', authMiddleware, isAdmin, asyncHandler(getAdminSubscriptions))
router.delete('/admin/subscriptions/:id', authMiddleware, isAdmin, asyncHandler(cancelAdminSubscription))
router.get('/admin/stats', authMiddleware, isAdmin, asyncHandler(getAdminSubscriptionStats))
router.get('/admin/revenue-analytics', authMiddleware, isAdmin, asyncHandler(getAdminRevenueAnalytics))

module.exports = router
