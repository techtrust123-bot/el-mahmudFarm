const axios = require('axios')
const crypto = require('crypto')
const authModel = require('../models/auth')
const logger = require('../utils/logger')
const { sendNotification } = require('../services/emailService')
const Payment = require('../models/payment')
const mongoose = require('mongoose')
const { clearSubscriptionCache } = require('../middleware/subscriptionMiddleware')

const PAYSTACK_SECRET =
  process.env.PAYSTACK_SECRET ||
  process.env.PAYSTACK_SECRET_KEY

if (!PAYSTACK_SECRET) {
  console.error(
    'Paystack secret is missing. Set PAYSTACK_SECRET in the backend .env file.'
  )
}

// const AMOUNT = Number(process.env.SUBSCRIPTION_AMOUNT) || 500000
const CALLBACK_URL = process.env.FRONTEND_URL
  ? `${process.env.FRONTEND_URL}/payment/verify`
  : 'http://localhost:5173/payment/verify'

  const SUBSCRIPTION_PLANS = {
  starter: {
    monthly: 250000,
    yearly: 2500000,
  },
  basic: {
    monthly: 550000,
    yearly: 6000000,
  },
  premium: {
    monthly: 850000,
    yearly: 9500000,
  },
}

const PLAN_ORDER = {
  starter: 1,
  basic: 2,
  premium: 3,
}

const normalizePlan = (value) => String(value || '').trim().toLowerCase()
const normalizeBillingCycle = (value) => String(value || '').trim().toLowerCase()



const buildSubscriptionData = (
  plan,
  billingCycle
) => {
  const now = new Date()

  const subscriptionEnd = new Date(now)

  if (billingCycle === 'yearly') {
    subscriptionEnd.setFullYear(
      subscriptionEnd.getFullYear() + 1
    )
  } else {
    subscriptionEnd.setMonth(
      subscriptionEnd.getMonth() + 1
    )
  }

  return {
    isSubscribed: true,
    subscriptionType: 'paid',
    subscriptionStatus: 'active',

    subscriptionPlan: plan,
    billingCycle,

    subscriptionStart: now,
    subscriptionEnd,
  }
}

const calculateUpgradeAmount = (user, targetPlan) => {
  const currentPlan = normalizePlan(user.subscriptionPlan)
  const billingCycle = normalizeBillingCycle(user.billingCycle)
  const now = Date.now()
  const subscriptionStart = new Date(user.subscriptionStart).getTime()
  const subscriptionEnd = new Date(user.subscriptionEnd).getTime()

  if (!PLAN_ORDER[currentPlan] || !PLAN_ORDER[targetPlan]) {
    throw new Error('Invalid subscription plan')
  }
  if (!['monthly', 'yearly'].includes(billingCycle)) {
    throw new Error('Invalid subscription billing cycle')
  }
  if (!SUBSCRIPTION_PLANS[targetPlan]?.[billingCycle]) {
    throw new Error('Invalid subscription billing cycle')
  }
  if (!Number.isFinite(subscriptionStart) || !Number.isFinite(subscriptionEnd) || subscriptionEnd <= now || subscriptionEnd <= subscriptionStart) {
    throw new Error('Subscription is not active')
  }

  const difference = SUBSCRIPTION_PLANS[targetPlan][billingCycle] - SUBSCRIPTION_PLANS[currentPlan][billingCycle]
  const remainingRatio = Math.min(Math.max((subscriptionEnd - now) / (subscriptionEnd - subscriptionStart), 0), 1)
  const amount = Math.round(difference * remainingRatio)

  if (amount <= 0 || amount > SUBSCRIPTION_PLANS[targetPlan][billingCycle]) {
    throw new Error('Calculated upgrade amount is invalid')
  }

  return { amount, currentPlan, billingCycle, subscriptionEnd: new Date(subscriptionEnd) }
}

exports.initializePayment = async (req, res) => {
  const userId = req.user.id
  const { plan, billingCycle } = req.body

  const normalizedPlan = String(plan || '').trim().toLowerCase()
  const normalizedBillingCycle = String(billingCycle || '').trim().toLowerCase()

  if (!SUBSCRIPTION_PLANS[normalizedPlan]) {
    return res.status(400).json({
      success: false,
      message: 'Invalid subscription plan',
    })
  }

  if (!['monthly', 'yearly'].includes(normalizedBillingCycle)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid billing cycle',
    })
  }

  const amount = SUBSCRIPTION_PLANS[normalizedPlan][normalizedBillingCycle]

  let payment;
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
    const hasActiveTrial =
      user.subscriptionStatus === 'trial' &&
      user.subscriptionEnd &&
      user.subscriptionEnd > now

    const hasActivePaidSubscription =
      user.isSubscribed &&
      user.subscriptionStatus === 'active' &&
      user.subscriptionType === 'paid' &&
      user.subscriptionEnd &&
      user.subscriptionEnd > now

    if (hasActivePaidSubscription) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active subscription',
        subscriptionEnd: user.subscriptionEnd,
      })
    }

    const reference = `SUB_${userId}_${Date.now()}`

    
     payment = await Payment.create({
      farmId: user.farmId,
      userId,
      reference,
      plan: normalizedPlan,
      billingCycle: normalizedBillingCycle,
      amount, 
      currency: 'NGN',
      status: 'pending',
  })

  
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: user.email,
        amount,
        currency: 'NGN',
        reference,
        callback_url: CALLBACK_URL,
        metadata: {
          userId: userId,
          farmId: user.farmId,
          type: 'subscription',
          plan: normalizedPlan,
          billingCycle: normalizedBillingCycle,
          paymentId: payment._id.toString(),
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

   if (
  String(response.data?.data?.reference) !==
  String(payment.reference)
) {
  await Payment.findOneAndUpdate(
    {
      _id: payment._id,
      status: 'pending',
    },
    {
      $set: {
        status: 'failed',
      },
    }
  )

  return res.status(400).json({
    success: false,
    message: 'Payment reference mismatch.',
  })
}

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
    console.log('Initialize payment error:', error.message, error.stack)
  try {
    if (payment?.reference) {
      await Payment.findOneAndUpdate(
        { reference: payment.reference },
        {
          $set: {
            status: 'failed',
          }
        }
      )
    }
  } catch (updateError) {
    logger.error(
      'Failed to update payment status after initialization error',
      {
        reference: payment?.reference,
        error: updateError.message,
        errorStack: updateError.stack,
      }
    )
  }

  logger.error('Initialize payment error', {
    error: error.message,
    reference: payment?.reference,
    errorStack: error.stack,
  })

  return res.status(500).json({
    console: error.message,
    success: false,
    message: 'Unable to initialize payment. Please try again.',
  })
}
  
}

exports.initializeUpgrade = async (req, res) => {
  const userId = req.user.id
  const targetPlan = normalizePlan(req.body?.plan)

  if (!PLAN_ORDER[targetPlan]) {
    return res.status(400).json({ success: false, message: 'Invalid target subscription plan' })
  }

  let payment
  try {
    const user = await authModel.findById(userId)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    if (user.userType === 'admin') {
      return res.status(403).json({ success: false, message: 'Admin users are not permitted to upgrade subscriptions.' })
    }
    if (user.userType === 'staff') {
      return res.status(403).json({ success: false, message: 'Staff cannot upgrade subscriptions.' })
    }
    if (!(user.isSubscribed && user.subscriptionStatus === 'active' && user.subscriptionType === 'paid')) {
      return res.status(400).json({ success: false, message: 'Trial users should use the normal subscription flow.' })
    }

    const currentPlan = normalizePlan(user.subscriptionPlan)
    if (!PLAN_ORDER[currentPlan]) {
      return res.status(400).json({ success: false, message: 'Current subscription plan is invalid.' })
    }
    if (PLAN_ORDER[targetPlan] <= PLAN_ORDER[currentPlan]) {
      return res.status(400).json({ success: false, message: 'Only upgrades to a higher plan are allowed.' })
    }

    const { amount, billingCycle } = calculateUpgradeAmount(user, targetPlan)
    const reference = `UPG_${userId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`

    payment = await Payment.create({
      farmId: user.farmId,
      userId,
      reference,
      plan: targetPlan,
      billingCycle,
      amount,
      currency: 'NGN',
      status: 'pending',
      paymentType: 'upgrade',
    })

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: user.email,
        amount,
        currency: 'NGN',
        reference,
        callback_url: CALLBACK_URL,
        metadata: {
          userId: String(userId),
          farmId: String(user.farmId),
          type: 'subscription',
          paymentType: 'upgrade',
          plan: targetPlan,
          billingCycle,
          paymentId: payment._id.toString(),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.data?.status || String(response.data?.data?.reference) !== String(reference)) {
      await Payment.findOneAndUpdate({ _id: payment._id, status: 'pending' }, { $set: { status: 'failed' } })
      return res.status(400).json({ success: false, message: 'Failed to initialize upgrade payment.' })
    }

    return res.status(200).json({
      success: true,
      message: 'Upgrade payment initialized',
      data: {
        authorizationUrl: response.data.data.authorization_url,
        reference: response.data.data.reference,
        accessCode: response.data.data.access_code,
      },
    })
  } catch (error) {
    if (payment?._id) {
      await Payment.findOneAndUpdate({ _id: payment._id, status: 'pending' }, { $set: { status: 'failed' } })
    }
    logger.error('Initialize upgrade error', { error: error.message, reference: payment?.reference })
    return res.status(error.message.includes('Subscription') || error.message.includes('upgrade') ? 400 : 500).json({
      success: false,
      message: error.message || 'Unable to initialize upgrade payment.',
    })
  }
}


const fulfillSuccessfulSubscription = async ({
  payment,
  paystackData,
}) => {
  if (!payment) {
    throw new Error('Payment record is required')
  }

  if (!paystackData) {
    throw new Error('Paystack payment data is required')
  }

  // --------------------------------------------------
  // 1. Idempotency check
  // --------------------------------------------------
  if (
    payment.status === 'success' &&
    payment.processedAt
  ) {
    return {
      alreadyProcessed: true,
      payment,
    }
  }

  // --------------------------------------------------
  // 2. Validate Paystack payment status
  // --------------------------------------------------
  if (paystackData.status !== 'success') {
    throw new Error(
      `Payment is not successful. Current status: ${paystackData.status}`
    )
  }

  // --------------------------------------------------
  // 3. Validate reference
  // --------------------------------------------------
  if (
    String(paystackData.reference) !==
    String(payment.reference)
  ) {
    throw new Error('Payment reference mismatch')
  }

  // --------------------------------------------------
  // 4. Validate amount
  // --------------------------------------------------
  if (
    Number(paystackData.amount) !==
    Number(payment.amount)
  ) {
    throw new Error('Payment amount mismatch')
  }

  // --------------------------------------------------
  // 5. Validate currency
  // --------------------------------------------------
  if (
    String(paystackData.currency).toUpperCase() !==
    String(payment.currency).toUpperCase()
  ) {
    throw new Error('Payment currency mismatch')
  }

  let session

  try {
    // --------------------------------------------------
    // 6. Load user
    // --------------------------------------------------
    const user = await authModel.findById(
      payment.userId
    )

    if (!user) {
      throw new Error('User not found')
    }

    // --------------------------------------------------
    // 7. Defense-in-depth farm isolation
    // --------------------------------------------------
    if (
      String(user.farmId) !==
      String(payment.farmId)
    ) {
      throw new Error(
        'Payment farm does not match user farm'
      )
    }

    // --------------------------------------------------
    // 8. User type protection
    // --------------------------------------------------
    if (user.userType === 'admin') {
      throw new Error(
        'Admin users cannot activate subscriptions'
      )
    }

    if (user.userType === 'staff') {
      throw new Error(
        'Staff users cannot activate subscriptions'
      )
    }

    // --------------------------------------------------
    // 9. Build subscription data
    // --------------------------------------------------
    const subscriptionData =
      buildSubscriptionData(
        payment.plan,
        payment.billingCycle
      )

    // --------------------------------------------------
    // 10. Start MongoDB transaction
    // --------------------------------------------------
    session = await mongoose.startSession()

    session.startTransaction()

    // --------------------------------------------------
    // 11. Activate subscription
    // --------------------------------------------------
    const updatedUser =
      await authModel.findByIdAndUpdate(
        payment.userId,
        {
          $set: {
            ...subscriptionData,
            paystackCustomerCode:
              paystackData.customer?.customer_code ||
              null,
          },
        },
        {
          session,
          returnDocument: 'after',
        }
      )

    if (!updatedUser) {
      throw new Error(
        'Failed to update user subscription'
      )
    }

    // --------------------------------------------------
    // 12. Finalize payment
    // --------------------------------------------------
    const updatedPayment =
      await Payment.findOneAndUpdate(
        {
          _id: payment._id,
          status: 'processing',
        },
        {
          $set: {
            ...subscriptionData,
            status: 'success',

            paystackTransactionId:
              String(paystackData.id),

            paidAt: paystackData.paid_at
              ? new Date(paystackData.paid_at)
              : new Date(),

            processedAt: new Date(),
          },
        },
        {
          session,
          returnDocument: 'after',
        }
      )

    if (!updatedPayment) {
      throw new Error(
        'Failed to finalize payment'
      )
    }

    // --------------------------------------------------
    // 13. Commit transaction
    // --------------------------------------------------
    await session.commitTransaction()
    clearSubscriptionCache(String(payment.userId))

    return {
      alreadyProcessed: false,
      user: updatedUser,
      payment: updatedPayment,
      subscriptionData,
    }
  } catch (error) {
    // --------------------------------------------------
    // 14. Rollback transaction
    // --------------------------------------------------
    if (session?.inTransaction()) {
      await session.abortTransaction()
    }

    throw error
  } finally {
    // --------------------------------------------------
    // 15. Close session
    // --------------------------------------------------
    if (session) {
      await session.endSession()
    }
  }
}

const fulfillSuccessfulUpgrade = async ({ payment, paystackData }) => {
  if (!payment || payment.paymentType !== 'upgrade') {
    throw new Error('Payment is not an upgrade payment')
  }
  if (!paystackData || paystackData.status !== 'success') {
    throw new Error('Payment is not successful')
  }
  if (payment.status === 'success' && payment.processedAt) {
    return { alreadyProcessed: true, payment }
  }
  if (String(paystackData.reference) !== String(payment.reference)) {
    throw new Error('Payment reference mismatch')
  }
  if (Number(paystackData.amount) !== Number(payment.amount)) {
    throw new Error('Payment amount mismatch')
  }
  if (String(paystackData.currency).toUpperCase() !== String(payment.currency).toUpperCase()) {
    throw new Error('Payment currency mismatch')
  }

  let session
  try {
    const user = await authModel.findById(payment.userId)
    if (!user) throw new Error('User not found')
    if (String(payment.farmId) !== String(user.farmId)) throw new Error('Payment farm does not match user farm')
    if (user.userType === 'admin' || user.userType === 'staff') throw new Error('User is not allowed to upgrade subscriptions')
    if (!(user.isSubscribed && user.subscriptionStatus === 'active' && user.subscriptionType === 'paid' && user.subscriptionEnd > new Date())) {
      throw new Error('Subscription is no longer eligible for upgrade')
    }

    const currentPlan = normalizePlan(user.subscriptionPlan)
    const targetPlan = normalizePlan(payment.plan)
    const billingCycle = normalizeBillingCycle(user.billingCycle)
    if (!PLAN_ORDER[currentPlan] || !PLAN_ORDER[targetPlan] || PLAN_ORDER[targetPlan] <= PLAN_ORDER[currentPlan]) {
      throw new Error('Only upgrades to a higher plan are allowed')
    }
    if (billingCycle !== normalizeBillingCycle(payment.billingCycle)) {
      throw new Error('Upgrade billing cycle does not match the current subscription')
    }

    session = await mongoose.startSession()
    session.startTransaction()

    const updatedUser = await authModel.findByIdAndUpdate(
      user._id,
      {
        $set: {
          subscriptionPlan: targetPlan,
          billingCycle,
          subscriptionStatus: 'active',
          subscriptionType: 'paid',
          isSubscribed: true,
          paystackCustomerCode: paystackData.customer?.customer_code || user.paystackCustomerCode || null,
        },
      },
      { session, returnDocument: 'after' }
    )

    const updatedPayment = await Payment.findOneAndUpdate(
      { _id: payment._id, status: 'processing' },
      {
        $set: {
          subscriptionPlan: targetPlan,
          billingCycle,
          subscriptionStatus: 'active',
          subscriptionType: 'paid',
          isSubscribed: true,
          status: 'success',
          paystackTransactionId: String(paystackData.id),
          paidAt: paystackData.paid_at ? new Date(paystackData.paid_at) : new Date(),
          processedAt: new Date(),
        },
      },
      { session, returnDocument: 'after' }
    )

    if (!updatedUser || !updatedPayment) throw new Error('Failed to finalize upgrade payment')
    await session.commitTransaction()
    clearSubscriptionCache(String(payment.userId))

    return {
      alreadyProcessed: false,
      user: updatedUser,
      payment: updatedPayment,
      subscriptionData: {
        subscriptionPlan: targetPlan,
        billingCycle,
        subscriptionStatus: 'active',
        subscriptionType: 'paid',
        isSubscribed: true,
        subscriptionStart: user.subscriptionStart,
        subscriptionEnd: user.subscriptionEnd,
      },
    }
  } catch (error) {
    if (session?.inTransaction()) await session.abortTransaction()
    throw error
  } finally {
    if (session) await session.endSession()
  }
}

exports.verifyPayment = async (req, res) => {
  const { reference } = req.params
  const userId = req.user.id

  let payment

  try {
    // --------------------------------------------------
    // 1. Find the payment belonging to the logged-in user
    // --------------------------------------------------
    payment = await Payment.findOne({
      reference,
      userId,
    })

    // --------------------------------------------------
    // 2. Load user
    // --------------------------------------------------
    const user = await authModel.findById(userId)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    // --------------------------------------------------
    // 3. User type protection
    // --------------------------------------------------
    if (user.userType === 'admin') {
      return res.status(403).json({
        success: false,
        message:
          'Admin users are not permitted to subscribe in this system.',
      })
    }

    if (user.userType === 'staff') {
      return res.status(403).json({
        success: false,
        message:
          'Staff cannot verify subscriptions. Please contact your manager.',
      })
    }

    // --------------------------------------------------
    // 4. Payment must exist
    // --------------------------------------------------
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      })
    }

    // --------------------------------------------------
    // 5. Defense-in-depth farm check
    // --------------------------------------------------
    if (
      String(payment.farmId) !==
      String(user.farmId)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Payment does not belong to this farm',
      })
    }

    // --------------------------------------------------
    // 6. Idempotency check
    // --------------------------------------------------
    if (
      payment.status === 'success' &&
      payment.processedAt
    ) {
      return res.status(200).json({
        success: true,
        message: 'Payment has already been processed.',
        data: {
          subscriptionStatus: 'active',
          subscriptionType: 'paid',
          subscriptionPlan: payment.plan,
          subscriptionBillingCycle: payment.billingCycle,
          subscriptionStart: user.subscriptionStart,
          subscriptionEnd: user.subscriptionEnd,
          paymentReference: payment.reference,
        },
      })
    }

    // --------------------------------------------------
    // 7. Claim payment: pending -> processing
    // --------------------------------------------------
    const processingPayment =
      await Payment.findOneAndUpdate(
        {
          _id: payment._id,
          status: 'pending',
        },
        {
          $set: {
            status: 'processing',
          },
        },
        {
          returnDocument: 'after',
        }
      )

    // --------------------------------------------------
    // 8. Payment could not be claimed
    // --------------------------------------------------
    if (!processingPayment) {
      const latestPayment =
        await Payment.findById(payment._id)

      if (
        latestPayment?.status === 'success' &&
        latestPayment?.processedAt
      ) {
        return res.status(200).json({
          success: true,
          message: 'Payment has already been processed.',
          data: {
            subscriptionStatus: 'active',
            subscriptionType: 'paid',
            subscriptionPlan: latestPayment.plan,
            subscriptionBillingCycle: payment.billingCycle,
            subscriptionStart: user.subscriptionStart,
            subscriptionEnd: user.subscriptionEnd,
            paymentReference: latestPayment.reference,
          },
        })
      }

      return res.status(409).json({
        success: false,
        message:
          'This payment is already being processed or has already been processed.',
      })
    }

    // --------------------------------------------------
    // 9. Verify payment with Paystack
    // --------------------------------------------------
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
        },
      }
    )

    const data = response.data?.data

    if (!data) {
      throw new Error(
        'Invalid response received from Paystack'
      )
    }

    // --------------------------------------------------
    // 10. Reference validation
    // --------------------------------------------------
    if (
      String(data.reference) !==
      String(processingPayment.reference)
    ) {
      await Payment.findOneAndUpdate(
        {
          _id: processingPayment._id,
          status: 'processing',
        },
        {
          $set: {
            status: 'failed',
          },
        }
      )

      return res.status(400).json({
        success: false,
        message: 'Payment reference mismatch.',
      })
    }

    // --------------------------------------------------
    // 11. Handle Paystack payment status
    // --------------------------------------------------
    if (data.status === 'failed') {
      await Payment.findOneAndUpdate(
        {
          _id: processingPayment._id,
          status: 'processing',
        },
        {
          $set: {
            status: 'failed',
          },
        }
      )

      return res.status(400).json({
        success: false,
        message: 'Payment failed. Please try again.',
      })
    }

    if (data.status === 'abandoned') {
      await Payment.findOneAndUpdate(
        {
          _id: processingPayment._id,
          status: 'processing',
        },
        {
          $set: {
            status: 'abandoned',
          },
        }
      )

      return res.status(400).json({
        success: false,
        message:
          'Payment was abandoned. Please try again.',
      })
    }

    if (
      data.status === 'pending' ||
      data.status === 'processing' ||
      data.status === 'ongoing' ||
      data.status === 'queued'
    ) {
      await Payment.findOneAndUpdate(
        {
          _id: processingPayment._id,
          status: 'processing',
        },
        {
          $set: {
            status: 'pending',
          },
        }
      )

      return res.status(503).json({
        success: false,
        message:
          'Payment is still being processed. Please try again later.',
      })
    }

    if (data.status === 'reversed') {
      await Payment.findOneAndUpdate(
        {
          _id: processingPayment._id,
          status: 'processing',
        },
        {
          $set: {
            status: 'failed',
          },
        }
      )

      return res.status(400).json({
        success: false,
        message:
          'This payment was reversed and cannot activate a subscription.',
      })
    }

    // --------------------------------------------------
    // 12. Final success guard
    // --------------------------------------------------
    if (data.status !== 'success') {
      await Payment.findOneAndUpdate(
        {
          _id: processingPayment._id,
          status: 'processing',
        },
        {
          $set: {
            status: 'pending',
          },
        }
      )

      return res.status(503).json({
        success: false,
        message:
          'Payment has not been confirmed yet. Please try again later.',
      })
    }

    // --------------------------------------------------
    // 13. Validate amount
    // --------------------------------------------------
    if (
      Number(data.amount) !==
      Number(processingPayment.amount)
    ) {
      await Payment.findOneAndUpdate(
        {
          _id: processingPayment._id,
          status: 'processing',
        },
        {
          $set: {
            status: 'failed',
          },
        }
      )

      return res.status(400).json({
        success: false,
        message: 'Payment amount mismatch.',
      })
    }

    // --------------------------------------------------
    // 14. Validate currency
    // --------------------------------------------------
    if (
      String(data.currency).toUpperCase() !==
      String(processingPayment.currency).toUpperCase()
    ) {
      await Payment.findOneAndUpdate(
        {
          _id: processingPayment._id,
          status: 'processing',
        },
        {
          $set: {
            status: 'failed',
          },
        }
      )

      return res.status(400).json({
        success: false,
        message: 'Payment currency mismatch.',
      })
    }

    // --------------------------------------------------
    // 15. Fulfill the successful payment
    // --------------------------------------------------
    const result = processingPayment.paymentType === 'upgrade'
      ? await fulfillSuccessfulUpgrade({ payment: processingPayment, paystackData: data })
      : await fulfillSuccessfulSubscription({ payment: processingPayment, paystackData: data })

    // --------------------------------------------------
    // 16. Already processed
    // --------------------------------------------------
    if (result.alreadyProcessed) {
      return res.status(200).json({
        success: true,
        message: 'Payment has already been processed.',
        data: {
          subscriptionStatus: 'active',
          subscriptionType: 'paid',
          subscriptionPlan: result.payment.plan,
          billingCycle: result.payment.billingCycle,
          paymentReference:
            processingPayment.reference,
        },
      })
    }

    // --------------------------------------------------
    // 17. Success response
    // --------------------------------------------------
    return res.status(200).json({
      success: true,
      message: 'Subscription activated successfully',
      data: {
        subscriptionStart:
          result.subscriptionData.subscriptionStart,

        subscriptionEnd:
          result.subscriptionData.subscriptionEnd,

        subscriptionStatus:
          result.subscriptionData.subscriptionStatus,

        subscriptionType:
          result.subscriptionData.subscriptionType,

        subscriptionPlan:
          result.subscriptionData.subscriptionPlan,

        billingCycle:
          result.subscriptionData.billingCycle,

        paymentReference:
          result.payment.reference,

        currency: result.payment.currency,

        amount: result.payment.amount / 100,
      },
    })
  } catch (error) {
    // --------------------------------------------------
    // Technical failure:
    // processing -> pending
    // --------------------------------------------------
    try {
      if (payment?._id) {
        await Payment.findOneAndUpdate(
          {
            _id: payment._id,
            status: 'processing',
          },
          {
            $set: {
              status: 'pending',
            },
          }
        )
      }
    } catch (updateError) {
      logger.error(
        '❌ Failed to reset payment after verification error',
        {
          paymentId: payment?._id,
          error: updateError.message,
        }
      )
    }

    logger.error('❌ Verify payment error', {
      paymentId: payment?._id,
      reference: payment?.reference,
      error: error.message,
    })

    return res.status(503).json({
      success: false,
      message:
        'Payment verification is temporarily unavailable. Please try again.',
    })
  }
}

exports.webhook = async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature']

    // --------------------------------------------------
    // 1. Validate signature + raw body
    // --------------------------------------------------
    if (!signature || !req.rawBody) {
      logger.error(
        '❌ Missing webhook signature or raw body'
      )

      return res.status(400).json({
        message: 'Invalid webhook request',
      })
    }

    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET)
      .update(req.rawBody)
      .digest('hex')

    if (
      hash.length !== signature.length ||
      !crypto.timingSafeEqual(
        Buffer.from(hash, 'utf8'),
        Buffer.from(signature, 'utf8')
      )
    ) {
      logger.error(
        '❌ Invalid webhook signature'
      )

      return res.status(401).json({
        message: 'Invalid signature',
      })
    }

    // --------------------------------------------------
    // 2. Get event
    // --------------------------------------------------
    const event = req.body

    // Ignore events we don't need
    if (event?.event !== 'charge.success') {
      return res.status(200).json({
        message: 'Webhook received',
      })
    }

    const data = event.data

    // --------------------------------------------------
    // 3. Validate successful charge payload
    // --------------------------------------------------
    if (
      !data ||
      data.status !== 'success' ||
      !data.reference
    ) {
      logger.error(
        '❌ Invalid charge.success payload'
      )

      return res.status(400).json({
        message: 'Invalid webhook payload',
      })
    }

    const reference = data.reference

    // --------------------------------------------------
    // 4. Find our internal payment
    // --------------------------------------------------
    const payment = await Payment.findOne({
      reference,
    })

    if (!payment) {
      logger.error(
        `❌ Payment not found for reference: ${reference}`
      )

      return res.status(404).json({
        message: 'Payment not found',
      })
    }

    // --------------------------------------------------
    // 5. Idempotency check
    // --------------------------------------------------
    if (
      payment.status === 'success' &&
      payment.processedAt
    ) {
      logger.info(
        `ℹ️ Payment already processed: ${reference}`
      )

      return res.status(200).json({
        success: true,
        message: 'Payment already processed',
      })
    }

    // --------------------------------------------------
    // 6. Validate reference
    // --------------------------------------------------
    if (
      String(data.reference) !==
      String(payment.reference)
    ) {
      logger.error(
        `❌ Payment reference mismatch: ${reference}`
      )

      return res.status(400).json({
        message: 'Payment reference mismatch',
      })
    }

    // --------------------------------------------------
    // 7. Validate amount
    // --------------------------------------------------
    if (
      Number(data.amount) !==
      Number(payment.amount)
    ) {
      logger.error(
        `❌ Payment amount mismatch: ${reference}`
      )

      return res.status(400).json({
        message: 'Payment amount mismatch',
      })
    }

    // --------------------------------------------------
    // 8. Validate currency
    // --------------------------------------------------
    if (
      String(data.currency).toUpperCase() !==
      String(payment.currency).toUpperCase()
    ) {
      logger.error(
        `❌ Payment currency mismatch: ${reference}`
      )

      return res.status(400).json({
        message: 'Payment currency mismatch',
      })
    }

    // --------------------------------------------------
    // 9. Validate metadata
    // --------------------------------------------------
    const metadata =
      data.metadata &&
      typeof data.metadata === 'object'
        ? data.metadata
        : {}

    if (
      String(metadata.userId || '') !==
        String(payment.userId) ||
      String(metadata.farmId || '') !==
        String(payment.farmId) ||
      String(metadata.type || '') !==
        'subscription' ||
      (metadata.paymentType && String(metadata.paymentType) !== String(payment.paymentType || 'new_subscription'))
    ) {
      logger.error(
        `❌ Payment metadata mismatch: ${reference}`
      )

      return res.status(400).json({
        message: 'Payment metadata mismatch',
      })
    }

    // --------------------------------------------------
    // 10. Claim payment
    // pending -> processing
    // --------------------------------------------------
    const processingPayment =
      await Payment.findOneAndUpdate(
        {
          _id: payment._id,
          status: 'pending',
        },
        {
          $set: {
            status: 'processing',
          },
        },
        {
          returnDocument: 'after',
        }
      )

    // --------------------------------------------------
    // 11. Another request already claimed it
    // --------------------------------------------------
    if (!processingPayment) {
      const latestPayment =
        await Payment.findById(payment._id)

      if (
        latestPayment?.status === 'success' &&
        latestPayment?.processedAt
      ) {
        return res.status(200).json({
          success: true,
          message: 'Payment already processed',
        })
      }

      return res.status(409).json({
        success: false,
        message:
          'Payment is already being processed',
      })
    }

    // --------------------------------------------------
    // 12. Fulfill payment
    // --------------------------------------------------
    try {
      const result = processingPayment.paymentType === 'upgrade'
        ? await fulfillSuccessfulUpgrade({ payment: processingPayment, paystackData: data })
        : await fulfillSuccessfulSubscription({ payment: processingPayment, paystackData: data })

      // ------------------------------------------------
      // Already processed
      // ------------------------------------------------
      if (result.alreadyProcessed) {
        return res.status(200).json({
          success: true,
          message:
            'Payment has already been processed.',
          data: {
            subscriptionStatus: 'active',
            paymentReference:
              processingPayment.reference,
          },
        })
      }

      logger.info(
        `✅ Subscription activated successfully. Reference: ${reference}`
      )

      return res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
      })
    } catch (error) {
      /*
       * Helper failed technically.
       *
       * Return payment to pending so it can be
       * safely processed again.
       */
      await Payment.findOneAndUpdate(
        {
          _id: processingPayment._id,
          status: 'processing',
        },
        {
          $set: {
            status: 'pending',
          },
        }
      )

      throw error
    }
  } catch (error) {
    logger.error(
      '❌ Webhook error',
      {
        message: error.message,
        stack: error.stack,
      }
    )

    return res.status(500).json({
      message: 'Webhook processing failed',
    })
  }
}

exports.getPaymentHistory = async (req, res) => {
  const userId = req.user.id

  try {
    const user = await authModel.findById(userId)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    if (!user.farmId) {
      return res.status(400).json({ success: false, message: 'User does not belong to any farm' })
    }

    const query = { farmId: user.farmId }
    if (user.userType === 'staff') {
      query.userId = userId
    }

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()

    const history = payments.map((payment) => ({
      id: payment._id,
      reference: payment.reference,
      plan: payment.plan,
      planName: payment.plan ? payment.plan.charAt(0).toUpperCase() + payment.plan.slice(1) : 'Unknown',
      billingCycle: payment.billingCycle,
      amount: Number(payment.amount || 0),
      currency: payment.currency || 'NGN',
      status: payment.status === 'success' ? 'active' : payment.status,
      startDate: payment.subscriptionStart || payment.createdAt,
      endDate: payment.subscriptionEnd || payment.createdAt,
      createdAt: payment.createdAt,
      processedAt: payment.processedAt,
      paidAt: payment.paidAt,
    }))

    return res.status(200).json({
      success: true,
      data: history,
    })
  } catch (error) {
    logger.error('Get payment history error', {
      message: error.message,
      stack: error.stack,
      userId,
    })

    return res.status(500).json({
      success: false,
      message: 'Unable to load subscription history right now.',
    })
  }
}

exports.getAdminSubscriptions = async (req, res) => {
  const actorId = req.user?.id
  const actorRole = req.user?.role || req.user?.userType || ''
  const actorType = req.user?.userType || ''

  try {
    if (!actorId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const isAdmin = actorRole === 'admin' || actorType === 'admin'
    const user = await authModel.findById(actorId).lean()

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Only managers and admins can view subscription records.' })
    }

    const filter = isAdmin ? {} : { farmId: user.farmId }
    const payments = await Payment.find(filter).sort({ createdAt: -1 }).lean()

    const userIds = [...new Set(payments.map((payment) => String(payment.userId)).filter(Boolean))]
    const users = await authModel.find({ _id: { $in: userIds } }).select('name farmName farmId email').lean()
    const userMap = new Map(users.map((item) => [String(item._id), item]))

    const rows = payments.map((payment) => {
      const payer = userMap.get(String(payment.userId)) || {}
      const status = payment.status === 'success' ? 'active' : payment.status === 'processing' ? 'pending' : payment.status

      return {
        id: payment.reference || String(payment._id),
        customer: payer.farmName || payer.name || 'Unknown farm',
        plan: payment.plan || 'starter',
        billingCycle: payment.billingCycle || 'monthly',
        amount: Number(payment.amount || 0),
        status,
        paymentReference: payment.reference,
        startDate: users.subscriptionStart || payment.subscriptionStart,
        endDate: users.subscriptionEnd || payment.createdAt,
        autoRenew: status === 'active',
        createdAt: payment.createdAt,
        updatedAt: payment.processedAt || payment.createdAt,
      }
    })

    return res.status(200).json({
      success: true,
      data: rows,
    })
  } catch (error) {
    logger.error('Get admin subscriptions error', {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
    })

    return res.status(500).json({
      success: false,
      message: 'Unable to load admin subscription records.',
    })
  }
}

exports.getAdminSubscriptionStats = async (req, res) => {
  const actorId = req.user?.id
  const actorRole = req.user?.role || req.user?.userType || ''
  const actorType = req.user?.userType || ''

  try {
    if (!actorId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const isAdmin = actorRole === 'admin' || actorType === 'admin'
    const user = await authModel.findById(actorId).lean()

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    if (!isAdmin && user.userType !== 'manager') {
      return res.status(403).json({ success: false, message: 'Only managers and admins can view subscription stats.' })
    }

    const filter = isAdmin ? {} : { farmId: user.farmId }

    const [totalSubscribers, activeSubscriptions, failedSubscriptions, pendingSubscriptions, monthlySubscriptions, yearlySubscriptions, starterSubscribers, basicSubscribers, premiumSubscribers] = await Promise.all([
      Payment.countDocuments(filter),
      Payment.countDocuments({ ...filter, status: 'success' }),
      Payment.countDocuments({ ...filter, status: 'failed' }),
      Payment.countDocuments({ ...filter, status: { $in: ['pending', 'processing'] } }),
      Payment.countDocuments({ ...filter, billingCycle: 'monthly' }),
      Payment.countDocuments({ ...filter, billingCycle: 'yearly' }),
      Payment.countDocuments({ ...filter, plan: 'starter' }),
      Payment.countDocuments({ ...filter, plan: 'basic' }),
      Payment.countDocuments({ ...filter, plan: 'premium' }),
    ])

    return res.status(200).json({
      success: true,
      data: {
        totalSubscribers,
        activeSubscriptions,
        expiredSubscriptions: failedSubscriptions,
        trialSubscriptions: 0,
        monthlySubscriptions,
        yearlySubscriptions,
        starterSubscribers,
        basicSubscribers,
        premiumSubscribers,
      },
    })
  } catch (error) {
    logger.error('Get admin subscription stats error', {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
    })

    return res.status(500).json({
      success: false,
      message: 'Unable to load admin subscription stats.',
    })
  }
}

exports.getAdminRevenueAnalytics = async (req, res) => {
  const actorRole = req.user?.role || ''
  const actorType = req.user?.userType || ''
  if (actorRole !== 'admin' && actorType !== 'admin') {
    return res.status(403).json({ success: false, message: 'Only administrators can view subscription revenue analytics.' })
  }

  try {
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date()
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
      return res.status(400).json({ success: false, message: 'Invalid analytics date range.' })
    }

    const granularity = ['day', 'week', 'month'].includes(req.query.granularity) ? req.query.granularity : 'day'
    const dateExpression = { $ifNull: ['$paidAt', { $ifNull: ['$processedAt', '$createdAt'] }] }
    const groupFormat = granularity === 'month' ? '%Y-%m' : granularity === 'week' ? '%G-W%V' : '%Y-%m-%d'
    const match = { status: 'success', processedAt: { $ne: null }, $expr: { $and: [{ $gte: [dateExpression, startDate] }, { $lte: [dateExpression, endDate] }] } }

    const [analytics, activeSubscriptions] = await Promise.all([
      Payment.aggregate([
        { $match: match },
        { $sort: { processedAt: 1, _id: 1 } },
        { $group: { _id: '$reference', plan: { $first: '$plan' }, amount: { $first: { $divide: ['$amount', 100] } }, paidDate: { $first: dateExpression } } },
        { $facet: {
          summary: [{ $group: { _id: null, totalRevenue: { $sum: '$amount' }, successfulPayments: { $sum: 1 } } }],
          revenueByPlan: [{ $group: { _id: '$plan', revenue: { $sum: '$amount' }, payments: { $sum: 1 } } }],
          revenueOverTime: [{ $group: { _id: { $dateToString: { format: groupFormat, date: '$paidDate' } }, revenue: { $sum: '$amount' }, payments: { $sum: 1 } } }, { $sort: { _id: 1 } }],
        } },
      ]),
      authModel.aggregate([
        { $match: { subscriptionStatus: 'active', isSubscribed: true, subscriptionPlan: { $in: ['starter', 'basic', 'premium'] } } },
        { $group: { _id: '$subscriptionPlan', count: { $sum: 1 } } },
      ]),
    ])

    const result = analytics[0] || {}
    const summary = result.summary?.[0] || { totalRevenue: 0, successfulPayments: 0 }
    const planRevenue = { starter: 0, basic: 0, premium: 0 }
    ;(result.revenueByPlan || []).forEach((item) => { if (item._id in planRevenue) planRevenue[item._id] = item.revenue || 0 })
    const planSubscriptions = { starter: 0, basic: 0, premium: 0 }
    activeSubscriptions.forEach((item) => { if (item._id in planSubscriptions) planSubscriptions[item._id] = item.count })

    return res.json({ success: true, data: {
      totalRevenue: summary.totalRevenue || 0,
      successfulPayments: summary.successfulPayments || 0,
      revenueByPlan: planRevenue,
      subscriptionsByPlan: planSubscriptions,
      revenueOverTime: (result.revenueOverTime || []).map((item) => ({ period: item._id, revenue: item.revenue || 0, payments: item.payments || 0 })),
      startDate,
      endDate,
      granularity,
    } })
  } catch (error) {
    logger.error('Get admin revenue analytics error', { message: error.message, stack: error.stack })
    return res.status(500).json({ success: false, message: 'Unable to load subscription revenue analytics.' })
  }
}

exports.getSubscriptionStatus = async (req, res) => {
  const userId = req.user.id
  try {
    const user = await authModel.findById(userId)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    if(!user.farmId){
      return res.status(400).json({ success: false, message: 'User does not belong to any farm' })
    }

    let target = user
    if (user.userType === 'staff') {
      const manager = await authModel.findOne({
        farmId: user.farmId,
        userType: 'manager',
      }).select('isSubscribed subscriptionStatus subscriptionType subscriptionStart subscriptionEnd subscriptionPlan billingCycle email name')
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
        subscriptionPlan: target.subscriptionPlan || 'none',
        subscriptionBillingCycle: target.billingCycle || 'none',
        daysRemaining,
      },
    })
  } catch (error) {
    console.error('Get subscription error:', error.message)
    res.status(500).json({ success: false, message: error.message })
  }
}

