const express = require('express')
const router = express.Router()
const { authMiddleware } = require('../middleweres/authMiddlewere')
const {
  initializePayment,
  verifyPayment,
  webhook,
  getSubscriptionStatus,
} = require('../controllers/paymentController')

router.post('/webhook', webhook)
router.post('/initialize', authMiddleware, initializePayment)
router.get('/verify/:reference', authMiddleware, verifyPayment)
router.get('/status', authMiddleware, getSubscriptionStatus)

module.exports = router
