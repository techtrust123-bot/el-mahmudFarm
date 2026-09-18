const ApiError = require('../utils/ApiError');
const authModel = require('../models/auth');

const PLAN_LABELS = {
  none: 'No active plan',
  free: 'Trial',
  starter: 'Starter',
  basic: 'Basic',
  premium: 'Premium',
};

const FEATURE_ACCESS = {
  dashboard: ['trial', 'starter', 'basic', 'premium', 'free'],
  livestock: ['trial', 'basic', 'premium', 'free'],
  poultry: ['trial', 'starter', 'basic', 'premium', 'free'],
  feed: ['trial', 'starter', 'basic', 'premium', 'free'],
  expenses: ['trial', 'starter', 'basic', 'premium', 'free'],
  sales: ['trial', 'basic', 'premium', 'free'],
  eggInventory: ['trial', 'premium', 'free'],
  support:['trial', 'starter', 'basic', 'premium', 'free'],
  subscriptions: ['trial', 'starter', 'basic', 'premium', 'free'],
  staff: ['trial', 'basic', 'premium', 'free'],
};

const normalizePlan = (value) => String(value || '').trim().toLowerCase();
const normalizeStatus = (value) => String(value || '').trim().toLowerCase();

const getEffectivePlan = (req) => {
  const planFromSubscription = normalizePlan(req?.subscription?.subscriptionPlan);
  const planFromUser = normalizePlan(req?.user?.subscriptionPlan);
  return planFromSubscription || planFromUser || 'none';
};

const getEffectiveStatus = (req) => {
  const statusFromSubscription = normalizeStatus(req?.subscription?.subscriptionStatus);
  const statusFromUser = normalizeStatus(req?.user?.subscriptionStatus);
  return statusFromSubscription || statusFromUser || 'inactive';
};

const getPlanLabel = (plan) => PLAN_LABELS[plan] || 'Current plan';

const isFeatureAllowed = (featureName, req) => {
  const plan = getEffectivePlan(req);
  const status = getEffectiveStatus(req);

  if (!req?.user) {
    return false;
  }

  if (normalizePlan(req.user.role) === 'admin' || normalizePlan(req.user.userType) === 'admin') {
    return true;
  }

  if (status === 'trial' || plan === 'free') {
    return true;
  }

  if (!req?.subscription || !req.subscription.isSubscribed || status !== 'active') {
    return false;
  }

  const allowedPlans = FEATURE_ACCESS[featureName] || [];
  return allowedPlans.includes(plan);
};

const requireFeatureAccess = (featureName) => (req, res, next) => {
  try {
    if (!req?.user) {
      return next(new ApiError(401, 'Authentication required', null, true, 'AUTH_REQUIRED'));
    }

    if (isFeatureAllowed(featureName, req)) {
      return next();
    }

    const plan = getEffectivePlan(req);
    const planLabel = getPlanLabel(plan);
    return next(
      new ApiError(
        403,
        `This feature is not available on the ${planLabel} plan. Please upgrade your subscription to continue.`,
        null,
        true,
        'FEATURE_ACCESS_DENIED'
      )
    );
  } catch (error) {
    return next(new ApiError(500, 'Feature authorization check failed', null, false, 'FEATURE_ACCESS_CHECK_FAILED'));
  }
};

const enforceBasicStaffLimit = async (req, res, next) => {
  try {
    if (!req?.user) {
      return next(new ApiError(401, 'Authentication required', null, true, 'AUTH_REQUIRED'));
    }

    if (req.user.userType !== 'manager' && req.user.role !== 'manager') {
      return next();
    }

    const plan = getEffectivePlan(req);
    const status = getEffectiveStatus(req);

    if (status === 'trial' || plan === 'free' || plan === 'premium') {
      return next();
    }

    if (plan !== 'basic') {
      return next();
    }

    const farmId = req.user.farmId;
    const staffCount = await authModel.countDocuments({ farmId, userType: 'staff' });

    if (staffCount >= 4) {
      return next(
        new ApiError(
          403,
          'Basic plan allows up to 4 staff members. Please upgrade to add more staff.',
          null,
          true,
          'STAFF_LIMIT_REACHED'
        )
      );
    }

    return next();
  } catch (error) {
    return next(new ApiError(500, 'Staff limit check failed', null, false, 'STAFF_LIMIT_CHECK_FAILED'));
  }
};

module.exports = {
  requireFeatureAccess,
  enforceBasicStaffLimit,
  isFeatureAllowed,
};
