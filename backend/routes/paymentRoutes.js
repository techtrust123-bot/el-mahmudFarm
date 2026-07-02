const express = require('express')
const router = express.Router()
const { authMiddleware } = require('../middleweres/authMiddlewere')
const { asyncHandler } = require('../middleware/errorHandler')
const {
  initializePayment,
  verifyPayment,
  webhook,
  getSubscriptionStatus,
} = require('../controllers/paymentController')

router.post('/webhook', asyncHandler(webhook))
router.post('/initialize', authMiddleware, asyncHandler(initializePayment))
router.get('/verify/:reference', authMiddleware, asyncHandler(verifyPayment))
router.get('/status', authMiddleware, asyncHandler(getSubscriptionStatus))

module.exports = router
