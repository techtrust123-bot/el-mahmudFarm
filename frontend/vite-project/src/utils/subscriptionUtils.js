export const calculateDaysRemaining = (endDate) => {
  if (!endDate) return null;

  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return null;

  const today = new Date();
  const diffMs = end.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

export const formatDisplayDate = (dateString) => {
  if (!dateString) return 'Not available';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Not available';

  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

export const getExpiryStatus = (endDate) => {
  const daysRemaining = calculateDaysRemaining(endDate);

  if (daysRemaining === null) {
    return { label: 'Unknown', tone: 'default' };
  }

  if (daysRemaining < 0) {
    return { label: 'Expired', tone: 'error' };
  }

  if (daysRemaining === 0) {
    return { label: 'Expires today', tone: 'warning' };
  }

  if (daysRemaining === 1) {
    return { label: 'Expires tomorrow', tone: 'warning' };
  }

  if (daysRemaining <= 7) {
    return { label: `Expires in ${daysRemaining} days`, tone: 'warning' };
  }

  return { label: 'Active', tone: 'success' };
};

export const getExpiryMessage = (endDate) => {
  const daysRemaining = calculateDaysRemaining(endDate);

  if (daysRemaining === null) {
    return 'Subscription status is unavailable.';
  }

  if (daysRemaining < 0) {
    return 'Your subscription has expired.';
  }

  if (daysRemaining === 0) {
    return 'Your subscription expires today.';
  }

  if (daysRemaining === 1) {
    return 'Your subscription expires tomorrow.';
  }

  if (daysRemaining <= 7) {
    return `Your subscription expires in ${daysRemaining} days.`;
  }

  return 'Your subscription is active.';
};
