// Utility to format and parse numeric currency strings
export const formatNumber = (value, opts = {}) => {
  const { locale = 'en-NG', minimumFractionDigits = 0, maximumFractionDigits = 2, currency = null, showCurrency = false } = opts;
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  if (Number.isNaN(num)) return '';

  if (currency && showCurrency) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(num);
  }

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(num);
};

export const parseNumber = (formatted) => {
  if (formatted === null || formatted === undefined || formatted === '') return '';
  // remove any non digit, non dot, non minus characters (e.g., currency symbols, spaces, commas)
  const cleaned = String(formatted).replace(/[^0-9.-]/g, '').trim();
  if (cleaned === '') return '';
  const num = Number(cleaned);
  return Number.isNaN(num) ? '' : num;
};

export default { formatNumber, parseNumber };
