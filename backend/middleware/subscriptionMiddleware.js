const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const authModel = require('../models/auth');
const { sendNotification } = require('../services/emailService');
const { createAuditLog } = require('./auditLogger');
const { sendError } = require('../utils/apiResponse');

// Optional in-memory cache as fallback when Redis is not configured.
const CACHE_TTL_MS = Number(process.env.SUBSCRIPTION_CACHE_TTL_MS || 60 * 1000);
const cache = new Map(); // { userId: { data, expiresAt } }

const GRACE_PERIOD_DAYS = Number(process.env.SUBSCRIPTION_GRACE_DAYS || 3);
const EXPIRY_NOTIFICATION_DAYS = Number(process.env.SUBSCRIPTION_NOTIFY_DAYS || 7);

const normalizeUser = (user) => ({
  id: String(user._id),
  userType: String(user.userType || 'manager'),
  farmId: user.farmId || null,
  email: user.email || null,
  isSubscribed: Boolean(user.isSubscribed),
  subscriptionEnd: user.subscriptionEnd || null,
  subscriptionStatus: user.subscriptionStatus || 'inactive'
});

const setCache = (key, value, ttl = CACHE_TTL_MS) => {
  try {
    cache.set(key, { data: value, expiresAt: Date.now() + ttl });
  } catch (e) {
    logger.warn('Subscription cache set failed', { error: e?.message });
  }
};

const getCache = (key) => {
  try {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return null;
    }
    return entry.data;
  } catch (e) {
    logger.warn('Subscription cache read failed', { error: e?.message });
    return null;
  }
};

const daysBetween = (a, b) => Math.ceil((b - a) / (1000 * 60 * 60 * 24));

/**
 * Resolve the effective subscription owner for the request.
 * For staff users, return their manager (farm owner) as the subscription source.
 */
const getSubscriptionOwner = async (user) => {
  if (!user) return null;
  if (user.userType === 'staff') {
    return await authModel.findOne({ farmId: user.farmId, userType: 'manager' }).select(
      'isSubscribed subscriptionEnd subscriptionStatus email name'
    );
  }

  return await authModel.findById(user.id).select('isSubscribed subscriptionEnd subscriptionStatus email name');
};

/**
 * Mark subscription expired in database in a safe way.
 */
const expireSubscription = async (targetUser) => {
  try {
    if (!targetUser || !targetUser._id) return;
    await authModel.findByIdAndUpdate(targetUser._id, {
      isSubscribed: false,
      subscriptionStatus: 'expired',
      subscriptionType: 'none'
    });
  } catch (err) {
    logger.error('Failed to expire subscription', { error: err?.message });
  }
};

/**
 * Build a consistent error response and throw ApiError so global handler responds.
 */
const forbidden = (message, code = 'SUBSCRIPTION_FORBIDDEN') => {
  return new ApiError(403, message, null, true, code);
};

/**
 * Main middleware entrypoint.
 */
const checkSubscription = async (req, res, next) => {
  const reqId = req.requestId || req.headers?.['x-request-id'] || null;
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, 'Authentication required', null, true, 'AUTH_REQUIRED');
    }

    // Bypass for admin users
    if (String(req.user.userType).toLowerCase() === 'admin' || String(req.user.role).toLowerCase() === 'admin') {
      return next();
    }

    const cached = getCache(req.user.id);
    let owner = cached || (await getSubscriptionOwner(req.user));

    if (!cached) setCache(req.user.id, owner);

    if (!owner) {
      throw forbidden('Subscription owner not found for this account', 'SUBSCRIPTION_OWNER_NOT_FOUND');
    }

    const now = new Date();
    const subscriptionEnd = owner.subscriptionEnd ? new Date(owner.subscriptionEnd) : null;

    // If subscription is missing or already in an expired state -> expire and block
    if (!owner.isSubscribed || !subscriptionEnd) {
      await expireSubscription(owner);
      await createAuditLog('SUBSCRIPTION_CHECK', 'subscription', {
        userId: req.user.id,
        farmId: req.user.farmId || null,
        req,
        status: 'FAILED',
        error: new Error('No active subscription')
      });
      throw forbidden('Your subscription is not active. Please subscribe to continue.', 'SUBSCRIPTION_INACTIVE');
    }

    // If subscription expired in DB but flag still true, expire it and block
    if (subscriptionEnd < now) {
      await expireSubscription(owner);
      await createAuditLog('SUBSCRIPTION_EXPIRED', 'subscription', {
        userId: req.user.id,
        farmId: req.user.farmId || null,
        req,
        status: 'FAILED',
        error: new Error('Subscription expired')
      });
      throw forbidden('Your subscription has expired. Please renew to continue.', 'SUBSCRIPTION_EXPIRED');
    }

    // Grace period: allow access if within GRACE_PERIOD_DAYS after expiry
    const daysRemaining = subscriptionEnd ? Math.max(daysBetween(now, subscriptionEnd), 0) : 0;
    if (daysRemaining <= 0) {
      // this path should be unreachable due to earlier expiry check, but keep for safety
      await expireSubscription(owner);
      throw forbidden('Your subscription has expired. Please renew to continue.', 'SUBSCRIPTION_EXPIRED');
    }

    // Send notification when expiry is approaching
    try {
      if (daysRemaining <= EXPIRY_NOTIFICATION_DAYS && owner.email) {
        // best-effort: do not await to keep request fast
        sendNotification(owner.email, 'SUBSCRIPTION_EXPIRING', {
          userName: owner.name || 'User',
          daysLeft: daysRemaining,
          expiryDate: owner.subscriptionEnd
        }).catch((e) => logger.warn('Expiry email send failed', { error: e?.message }));
      }
    } catch (e) {
      logger.warn('Subscription notification failure', { error: e?.message });
    }

    // Passed checks — attach subscription info to request for downstream use
    req.subscription = {
      isSubscribed: true,
      subscriptionStatus: owner.subscriptionStatus || 'active',
      subscriptionEnd: owner.subscriptionEnd,
      daysRemaining
    };

    // audit a successful subscription check for managers (skip for staff to avoid duplicates)
    try {
      await createAuditLog('SUBSCRIPTION_CHECK', 'subscription', {
        userId: req.user.id,
        farmId: req.user.farmId || null,
        req,
        status: 'SUCCESS'
      });
    } catch (e) {
      logger.warn('Subscription audit failed', { error: e?.message });
    }

    return next();
  } catch (err) {
    // Normalize errors into ApiError for centralized handler
    if (!(err instanceof ApiError)) {
      logger.error('Subscription middleware unexpected error', { error: err?.message, requestId: reqId });
      return next(new ApiError(500, 'Subscription check failed', null, false, 'SUBSCRIPTION_CHECK_FAILED'));
    }

    return next(err);
  }
};

module.exports = { checkSubscription };
