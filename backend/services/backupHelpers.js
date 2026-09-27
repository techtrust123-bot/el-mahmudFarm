/**
 * Backup Helper Utilities
 *
 * Pure functions and validation helpers for backup service logic.
 */

/**
 * Validate and normalize the configured MongoDB connection string.
 *
 * @param {string} mongoUri - The raw MongoDB URI.
 * @returns {string} A validated MongoDB URI.
 * @throws {Error} When the URI is missing or invalid.
 */
function validateMongoUri(mongoUri) {
  if (!mongoUri || typeof mongoUri !== 'string' || !mongoUri.trim()) {
    throw new Error('MongoDB URI is missing or empty.');
  }

  const normalizedUri = mongoUri.trim();

  if (
    !normalizedUri.startsWith('mongodb://') &&
    !normalizedUri.startsWith('mongodb+srv://')
  ) {
    throw new Error('Invalid MongoDB URI protocol.');
  }

  return normalizedUri;
}

/**
 * Resolve the main database name from the connection string.
 *
 * @param {string} mongoUri - The MongoDB URI.
 * @returns {string} The database name or the default CloudFarm main database.
 */
function resolveMainDatabaseName(mongoUri) {
  try {
    const uriWithoutQuery = mongoUri.split('?')[0];

    const slashIndex = uriWithoutQuery.indexOf('/', 'mongodb://'.length);

    if (slashIndex === -1) {
      return 'cloudfarm_main';
    }

    const databaseName = uriWithoutQuery
      .slice(slashIndex + 1)
      .replace(/\/+$/, '')
      .trim();

    return databaseName || 'cloudfarm_main';
  } catch (error) {
    return 'cloudfarm_main';
  }
}

/**
 * Normalize the requested backup target into a standard configuration object.
 *
 * @param {string|object|null} target - The backup target or options object.
 * @param {object} options - Additional backup options.
 * @returns {object} Normalized backup configuration.
 */
function normalizeBackupOptions(target, options = {}) {
  const normalized =
    typeof target === 'object' &&
    target !== null &&
    !Array.isArray(target)
      ? { ...target, ...options }
      : { farmId: target, ...options };

  const targetType =
    normalized.target ||
    normalized.type ||
    (normalized.includeAllFarms
      ? 'all-farms'
      : normalized.farmId
        ? 'farm'
        : 'main');

  return {
    ...normalized,
    targetType
  };
}

/**
 * Format bytes into a human-readable string.
 *
 * @param {number} bytes - The byte count.
 * @returns {string} The formatted size string.
 */
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

module.exports = {
  validateMongoUri,
  resolveMainDatabaseName,
  normalizeBackupOptions,
  formatBytes
};