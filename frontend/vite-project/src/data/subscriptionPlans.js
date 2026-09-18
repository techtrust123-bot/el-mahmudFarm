export const FEATURE_ACCESS_BY_PLAN = {
  trial: {
    dashboard: true,
    livestock: true,
    poultry: true,
    feed: true,
    expenses: true,
    sales: true,
    eggInventory: true,
    staff: true,
    subscriptions: true,
  },
  free: {
    dashboard: true,
    livestock: true,
    poultry: true,
    feed: true,
    expenses: true,
    sales: true,
    eggInventory: true,
    staff: true,
    subscriptions: true,
  },
  starter: {
    dashboard: true,
    livestock: false,
    poultry: true,
    feed: true,
    expenses: true,
    sales: false,
    eggInventory: false,
    staff: false,
    subscriptions: true,
  },
  basic: {
    dashboard: true,
    livestock: true,
    poultry: true,
    feed: true,
    expenses: true,
    sales: true,
    eggInventory: false,
    staff: true,
    subscriptions: true,
  },
  premium: {
    dashboard: true,
    livestock: true,
    poultry: true,
    feed: true,
    expenses: true,
    sales: true,
    eggInventory: true,
    staff: true,
    subscriptions: true,
  },
};

export const isFeatureAllowedForPlan = (plan, feature, status) => {
  const normalizedPlan = String(plan || '').trim().toLowerCase();
  const normalizedStatus = String(status || '').trim().toLowerCase();

  if (!normalizedPlan && normalizedStatus === 'trial') {
    return true;
  }

  if (normalizedStatus === 'trial' || normalizedPlan === 'free') {
    return true;
  }

  const featureMap = FEATURE_ACCESS_BY_PLAN[normalizedPlan] || {};
  return Boolean(featureMap[feature]);
};

export const canAccessFeature = (user, feature) => {
  if (!user) return false;
  const userRole = String(user.role || '').trim().toLowerCase();
  const userType = String(user.userType || '').trim().toLowerCase();
  if (userRole === 'admin' || userType === 'admin') {
    return true;
  }
  const effectivePlan = String(user.subscriptionPlan || user.plan || 'none').trim().toLowerCase();
  const effectiveStatus = String(user.subscriptionStatus || 'inactive').trim().toLowerCase();
  if (feature === 'subscriptions' || feature === 'subscription') {
    return true;
  }
  return isFeatureAllowedForPlan(effectivePlan, feature, effectiveStatus);
};

export const subscriptionPlans = [
  // {
  //   key: 'free',
  //   name: 'Free',
  //   monthlyPrice: 0,
  //   yearlyPrice: 0,
  //   description: 'A simple plan for small farms beginning their digital journey.',
  //   features: [
  //     'Up to 50 livestock records',
  //     'Basic farm dashboard',
  //     'Manual inventory tracking',
  //     'Email support',
  //     'Monthly summaries',
  //   ],
  //   recommended: false,
  // },
  {
    key: 'starter',
    name: 'Starter',
    monthlyPrice: 2500,
    yearlyPrice: 25000,
    description: 'A simple plan for small farms beginning their digital journey.',
    features: [
      'Up to 50 livestock records',
      'Basic farm dashboard',
      'Poultry management & tracking',
      'Feed management',
      'Expense management & tracking',
      'Record Exporting',
    ],
    recommended: false,
  },
  {
    key: 'basic',
    name: 'Basic',
    monthlyPrice: 5500,
    yearlyPrice: 60000,
    description: 'Built for active farms that need more visibility and control.',
    features: [
      'Livestock Management and tracking',
      'Poultry management & tracking',
      'Feed management',
      'Expense management & tracking',
      'Sales tracking & reporting',
      'Record Exporting',
      'Limited Staff management and permissions',
    ],
    recommended: false,
  },
  {
    key: 'premium',
    name: 'Premium',
    monthlyPrice: 8500,
    yearlyPrice: 95000,
    description: 'For larger operations that need more support and growth tooling.',
    features: [
      'Unlimited farm tracking',
      'Egg inventory management and tracking',
      'Unlimited Staff management and permissions',
      'Livestock Management and tracking',
      'Poultry management & tracking',
      'Feed management',
      'Expense management & tracking',
      'Sales tracking & reporting',
      'Record Exporting',
      'Advanced analytics insights',
      'Inventory and sales reports',
      'Priority support and onboarding',
      'Advanced performance insights',
      'Dedicated account assistance',
      
    ],
    recommended: true,
  },
];

export const billingCycleOptions = [
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

export const formatCurrency = (value) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const getPlanPrice = (plan, billingCycle = 'monthly') => {
  if (!plan) return 0;
  return billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
};

export const getBillingPeriodLabel = (billingCycle = 'monthly') =>
  billingCycle === 'yearly' ? '/year' : '/month';

export const getYearlySavings = (plan) => {
  if (!plan) return 0;
  return plan.monthlyPrice * 12 - plan.yearlyPrice;
};

export const getSavingsText = (plan) => {
  const savings = getYearlySavings(plan);
  return `Save ${formatCurrency(savings)} annually`;
};
