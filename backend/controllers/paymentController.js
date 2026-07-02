const axios = require('axios')
const crypto = require('crypto')
const authModel = require('../models/auth')
const { sendNotification } = require('../services/emailService')

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY
const AMOUNT = Number(process.env.SUBSCRIPTION_AMOUNT) || 500000
const CALLBACK_URL = process.env.FRONTEND_URL
  ? `${process.env.FRONTEND_URL}/payment/verify`
  : 'http://localhost:5173/payment/verify'

const buildSubscriptionData = () => ({
  isSubscribed: true,
  subscriptionType: 'paid',
  subscriptionStatus: 'active',
  subscriptionStart: new Date(),
  subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
})

exports.initializePayment = async (req, res) => {
  const userId = req.user.id
  try {
    const user = await authModel.findById(userId)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    if (user.userType === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin users are not permitted to subscribe in this system.',
      })
    }

    if (user.userType === 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Staff cannot initiate subscriptions. Please contact your manager.',
      })
    }

    const now = new Date()
    if (user.isSubscribed && user.subscriptionEnd && user.subscriptionEnd > now) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active subscription',
        subscriptionEnd: user.subscriptionEnd,
      })
    }

    const reference = `SUB_${userId}_${Date.now()}`
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: user.email,
        amount: AMOUNT,
        currency: 'NGN',
        reference,
        callback_url: CALLBACK_URL,
        metadata: {
          userId: userId,
          farmId: user.farmId,
          type: 'subscription',
          custom_fields: [
            {
              display_name: 'Farm Name',
              variable_name: 'farm_name',
              value: user.farmName || user.name,
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (response.data.status) {
      await authModel.findByIdAndUpdate(userId, {
        lastPaymentReference: response.data.data.reference,
      })

      return res.status(200).json({
        success: true,
        message: 'Payment initialized',
        data: {
          authorizationUrl: response.data.data.authorization_url,
          reference: response.data.data.reference,
          accessCode: response.data.data.access_code,
        },
      })
    }

    return res.status(400).json({ success: false, message: 'Failed to initialize payment' })
  } catch (error) {
    console.error('Initialize payment error:', error.message)
    res.status(500).json({ success: false, message: error.message })
  }
}

exports.verifyPayment = async (req, res) => {
  const { reference } = req.params
  const userId = req.user.id

  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
        },
      }
    )

    const data = response.data.data
    if (data.status !== 'success') {
      return res.status(400).json({
        success: false,
        message: `Payment ${data.status} — please try again`,
      })
    }

    if (data.amount !== AMOUNT) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount mismatch',
      })
    }

    const user = await authModel.findById(userId)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    if (user.userType === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin users are not permitted to subscribe in this system.',
      })
    }

    if (user.userType === 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Staff cannot verify subscriptions. Please contact your manager.',
      })
    }

    if (user.lastPaymentReference !== reference) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment reference',
      })
    }

    const subscriptionData = buildSubscriptionData()
    await authModel.findByIdAndUpdate(userId, {
      ...subscriptionData,
      paystackCustomerCode: data.customer?.customer_code || null,
    })

    res.status(200).json({
      success: true,
      message: 'Subscription activated successfully',
      data: {
        subscriptionStart: subscriptionData.subscriptionStart,
        subscriptionEnd: subscriptionData.subscriptionEnd,
        amount: data.amount / 100,
      },
    })
  } catch (error) {
    console.error('Verify payment error:', error.message)
    res.status(500).json({ success: false, message: error.message })
  }
}

exports.webhook = async (req, res) => {
  try {
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex')

    if (hash !== req.headers['x-paystack-signature']) {
      console.log('❌ Invalid webhook signature')
      return res.status(401).json({ message: 'Invalid signature' })
    }

    const event = req.body
    if (event.event === 'charge.success') {
      const metadata = event.data.metadata || {}
      const userId = metadata.userId

      if (userId && metadata.type === 'subscription') {
      const user = await authModel.findById(userId).select('userType')
      if (user && user.userType === 'admin') {
        console.log(`⚠️ Ignoring subscription webhook for admin user: ${userId}`)
      } else {
        const subscriptionData = buildSubscriptionData()
        await authModel.findByIdAndUpdate(userId, {
          ...subscriptionData,
        })
        console.log(`✅ Subscription activated for user: ${userId}`)
      }
    }
    }

    res.status(200).json({ message: 'Webhook received' })
  } catch (error) {
    console.error('Webhook error:', error.message)
    res.status(200).json({ message: 'Webhook received' })
  }
}

exports.getSubscriptionStatus = async (req, res) => {
  const userId = req.user.id
  try {
    const user = await authModel.findById(userId)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    let target = user
    if (user.userType === 'staff') {
      const manager = await authModel.findOne({
        farmId: user.farmId,
        userType: 'manager',
      }).select('isSubscribed subscriptionStatus subscriptionType subscriptionStart subscriptionEnd')
      if (manager) {
        target = manager
      }
    }

    if (target.subscriptionEnd && target.subscriptionEnd < new Date()) {
      await authModel.findByIdAndUpdate(target._id, {
        isSubscribed: false,
        subscriptionStatus: 'expired',
        subscriptionType: 'none',
      })
      return res.status(200).json({
        success: true,
        data: {
          isSubscribed: false,
          subscriptionStatus: 'expired',
          subscriptionType: 'none',
          subscriptionStart: target.subscriptionStart,
          subscriptionEnd: target.subscriptionEnd,
          daysRemaining: 0,
        },
      })
    }

    const daysRemaining = target.subscriptionEnd
      ? Math.max(Math.ceil((target.subscriptionEnd - new Date()) / (1000 * 60 * 60 * 24)), 0)
      : 0

    if (daysRemaining <= 7 && target.email) {
      await sendNotification(target.email, 'SUBSCRIPTION_EXPIRING', {
        userName: target.name || 'User',
        daysLeft: daysRemaining,
        expiryDate: target.subscriptionEnd
      })
    }

    res.status(200).json({
      success: true,
      data: {
        isSubscribed: Boolean(target.isSubscribed),
        subscriptionStatus: target.subscriptionStatus,
        subscriptionType: target.subscriptionType || 'none',
        subscriptionStart: target.subscriptionStart,
        subscriptionEnd: target.subscriptionEnd,
        daysRemaining,
      },
    })
  } catch (error) {
    console.error('Get subscription error:', error.message)
    res.status(500).json({ success: false, message: error.message })
  }
}
