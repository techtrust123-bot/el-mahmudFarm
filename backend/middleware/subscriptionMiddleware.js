const authModel = require('../models/auth')

const checkSubscription = async (req, res, next) => {
  try {
    const user = await authModel.findById(req.user.id).select(
      'userType isSubscribed subscriptionEnd subscriptionStatus farmId'
    )

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    if (user.userType === 'admin') {
      return next()
    }

    if (user.userType === 'staff') {
      const manager = await authModel.findOne({
        farmId: user.farmId,
        userType: 'manager',
      }).select('isSubscribed subscriptionEnd subscriptionStatus')

      if (!manager || !manager.isSubscribed || !manager.subscriptionEnd || manager.subscriptionEnd < new Date()) {
        if (manager && manager.subscriptionEnd && manager.subscriptionEnd < new Date()) {
          await authModel.findByIdAndUpdate(manager._id, {
            isSubscribed: false,
            subscriptionStatus: 'expired',
            subscriptionType: 'none',
          })
        }

        return res.status(403).json({
          success: false,
          message: 'Farm subscription expired. Please contact your manager.',
          code: 'SUBSCRIPTION_EXPIRED',
        })
      }

      return next()
    }

    if (!user.isSubscribed || !user.subscriptionEnd || user.subscriptionEnd < new Date()) {
      if (user.subscriptionEnd && user.subscriptionEnd < new Date()) {
        await authModel.findByIdAndUpdate(req.user.id, {
          isSubscribed: false,
          subscriptionStatus: 'expired',
          subscriptionType: 'none',
        })
      }

      return res.status(403).json({
        success: false,
        message: 'Your subscription has expired. Please renew.',
        code: 'SUBSCRIPTION_EXPIRED',
      })
    }

    next()
  } catch (error) {
    console.error('Subscription check error:', error.message)
    res.status(500).json({ success: false, message: error.message })
  }
}

module.exports = { checkSubscription }
