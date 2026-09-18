const { getFarmConnection } = require('../utils/dbManager');
const { getModels } = require('../utils/modelFactory');
const { sendError } = require('../utils/apiResponse');
const logger = require('../utils/logger');

const REQUIRED_FARM_MODEL_NAMES = [
  'Feed',
  'Poultry',
  'LiveStock',
  'Sells',
  'Expenses',
  'Staff',
  'Egg',
  'Counter',
  'AuditLog',
  'Notification',
  'SupportConversation'
];

const FARM_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * Determine whether the provided object is a valid Mongoose model.
 *
 * @param {*} candidate
 * @returns {boolean}
 */
const isValidModel = (candidate) => {
  return candidate && typeof candidate === 'function' && typeof candidate.modelName === 'string';
};

/**
 * Verify that all expected farm models were initialized successfully.
 *
 * @param {object} farmModels
 * @returns {{ valid: boolean, missingModels: string[] }}
 */
const validateFarmModels = (farmModels) => {
  if (!farmModels || typeof farmModels !== 'object') {
    return { valid: false, missingModels: REQUIRED_FARM_MODEL_NAMES.slice() };
  }

  const missingModels = REQUIRED_FARM_MODEL_NAMES.filter((modelName) => !isValidModel(farmModels[modelName]));
  return { valid: missingModels.length === 0, missingModels };
};

/**
 * Normalize and validate farm identifiers.
 *
 * @param {*} rawFarmId
 * @returns {string|null}
 */
const normalizeFarmId = (rawFarmId) => {
  if (typeof rawFarmId !== 'string') {
    return null;
  }

  const trimmedFarmId = rawFarmId.trim();
  return FARM_ID_PATTERN.test(trimmedFarmId) ? trimmedFarmId : null;
};

/**
 * Send a standardized error response without leaking internal details.
 *
 * @param {object} res
 * @param {number} statusCode
 * @param {string} message
 * @param {object} [logMeta]
 * @returns {object}
 */
const sendDbError = (res, statusCode, message, logMeta = {}) => {
  logger.error(message, logMeta);
  return res.status(statusCode).json(sendError(statusCode, message));
};

/**
 * Build the standard request metadata used for logging and diagnostics.
 *
 * @param {object} req
 * @returns {object}
 */
const buildRequestMeta = (req) => ({
  method: req.method,
  path: req.originalUrl || req.url,
  requestId: req.requestId || req.headers?.['x-request-id'] || null,
  userId: req.user?.id || null,
  farmId: req.user?.farmId || null
});

/**
 * Attach farm-specific models to the request after verifying tenant context.
 *
 * @param {object} req
 * @param {object} res
 * @param {function} next
 */
const attachFarmDB = async (req, res, next) => {
  const startTime = process.hrtime.bigint();
  const requestMeta = buildRequestMeta(req);

  logger.info('attachFarmDB middleware started', requestMeta);

  if (!req.user) {
    return sendDbError(res, 401, 'Unauthorized: authentication required.', requestMeta);
  }

  const farmId = normalizeFarmId(req.user.farmId);
  if (!farmId) {
    return sendDbError(res, 403, 'Forbidden: invalid farm identifier provided.', requestMeta);
  }

  const userId = String(req.user.id || 'unknown');

  if (req.farmModels && req.farmContext?.farmId === farmId) {
    const existingModelsValid = validateFarmModels(req.farmModels).valid;

    if (existingModelsValid) {
      logger.info('attachFarmDB reused request-local farmModels', {
        ...requestMeta,
        userId,
        farmId
      });
      return next();
    }

    logger.warn('attachFarmDB detected invalid or stale farmModels on request and will reinitialize', {
      ...requestMeta,
      userId,
      farmId
    });
  }

  let farmConnection;

  try {
    farmConnection = await getFarmConnection(farmId);
  } catch (connectionError) {
    return sendDbError(res, 500, 'Internal Server Error: unable to connect to tenant database.', {
      ...requestMeta,
      error: connectionError?.message || 'unknown'
    });
  }

  if (!farmConnection || farmConnection.readyState !== 1) {
    return sendDbError(res, 500, 'Internal Server Error: tenant database connection is unavailable.', {
      ...requestMeta,
      connectionState: farmConnection?.readyState
    });
  }

  let farmModels;
  try {
    farmModels = getModels(farmConnection);
  } catch (modelFactoryError) {
    return sendDbError(res, 500, 'Internal Server Error: failed to initialize tenant models.', {
      ...requestMeta,
      error: modelFactoryError?.message || 'unknown'
    });
  }

  const { valid, missingModels } = validateFarmModels(farmModels);
  if (!valid) {
    return sendDbError(res, 500, 'Internal Server Error: incomplete tenant model initialization.', {
      ...requestMeta,
      missingModels
    });
  }

  req.farmModels = Object.freeze({ ...farmModels });
  req.farmContext = Object.freeze({
    farmId,
    userId,
    initializedAt: new Date().toISOString()
  });

  const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;
  logger.info('attachFarmDB middleware completed successfully', {
    ...requestMeta,
    userId,
    farmId,
    modelCount: Object.keys(farmModels).length,
    durationMs
  });

  return next();
};

module.exports = { attachFarmDB };