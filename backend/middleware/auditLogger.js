/**
 * Audit Logging Middleware
 * Tracks farm-level events and stores them in the farm database audit collection.
 */
const logger = require('../utils/logger');
const DefaultAuditLog = require('../models/auditLog');
const { getAuditLogModel } = require('../utils/auditModelFactory');
const { buildAuditDocument } = require('../utils/auditUtils');

/**
 * Log audit event to the configured AuditLog model.
 * This must never block business flow.
 *
 * @param {object} AuditLogModel - Mongoose model for audit entries
 * @param {object} auditData - Prepared audit document
 */
const logAudit = async (AuditLogModel, auditData) => {
  try {
    const audit = new AuditLogModel(auditData);
    await audit.save();
  } catch (error) {
    logger.error('Error logging audit event', {
      message: error?.message || 'Unknown audit logging error',
      stack: error?.stack,
      auditData
    });
  }
};

/**
 * Create audit log entry using the farm database audit model when possible.
 *
 * @param {string} action
 * @param {string} entityType
 * @param {object} options
 * @param {string|object} options.userId
 * @param {string} options.farmId
 * @param {string|null} [options.entityId]
 * @param {object|null} [options.before]
 * @param {object|null} [options.after]
 * @param {object|null} [options.req]
 * @param {string} [options.status='SUCCESS']
 * @param {Error|null} [options.error]
 * @param {number|Date|null} [options.startTime]
 * @param {number|Date|null} [options.endTime]
 * @param {number|null} [options.maxPayloadBytes]
 */
const createAuditLog = async (action, entityType, options = {}) => {
  const {
    userId,
    farmId,
    entityId = null,
    before = null,
    after = null,
    req = null,
    status = 'SUCCESS',
    error = null,
    startTime = null,
    endTime = null,
    maxPayloadBytes = null
  } = options;

  const AuditLogModel = req?.farmModels?.AuditLog || DefaultAuditLog;

  const auditDocument = buildAuditDocument({
    action,
    entityType,
    userId,
    farmId,
    entityId,
    before,
    after,
    req,
    status,
    error,
    startTime,
    endTime,
    maxPayloadBytes
  });

  if (!farmId) {
    logger.warn('Skipping audit log save because farmId is missing.', {
      action,
      entityType,
      userId,
      auditDocument
    });
    return;
  }

  await logAudit(AuditLogModel, auditDocument);
};

/**
 * Express middleware factory to automatically generate audit entries for route responses.
 *
 * @param {string} action
 * @param {string} entityType
 * @returns {function} Express middleware
 */
const auditMiddleware = (action, entityType) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    const captureResult = async (body) => {
      try {
        const endTime = Date.now();
        const payload = typeof body === 'string' ? tryParseJson(body) : body;

        await createAuditLog(action, entityType, {
          userId: req.user?.id || null,
          farmId: req.user?.farmId || null,
          entityId: req.params?.id || payload?.data?._id || null,
          before: null,
          after: payload?.data || payload || null,
          req,
          status: (res.statusCode >= 400 || payload?.success === false) ? 'FAILED' : 'SUCCESS',
          error: payload?.success === false ? new Error(payload?.message || 'Audit middleware detected failed response') : null,
          startTime,
          endTime
        });
      } catch (error) {
        logger.error('Audit middleware failed to create audit log', {
          message: error?.message || 'Unknown error',
          stack: error?.stack
        });
      }
    };

    res.json = function (data) {
      captureResult(data).catch(() => {});
      return originalJson(data);
    };

    res.send = function (body) {
      captureResult(body).catch(() => {});
      return originalSend(body);
    };

    next();
  };
};

/**
 * Parse a JSON string safely.
 *
 * @param {string} source
 * @returns {object|null}
 */
const tryParseJson = (source) => {
  if (typeof source !== 'string') {
    return source;
  }

  try {
    return JSON.parse(source);
  } catch (_error) {
    return { data: source };
  }
};

/**
 * Get audit logs with pagination, filtering, sorting, and date range support.
 *
 * @param {object} filters
 * @param {string|null} [filters.userId]
 * @param {string|null} [filters.farmId]
 * @param {string|null} [filters.action]
 * @param {string|null} [filters.entityType]
 * @param {string|null} [filters.severity]
 * @param {string|null} [filters.status]
 * @param {string|null} [filters.startDate]
 * @param {string|null} [filters.endDate]
 * @param {number} [filters.page=1]
 * @param {number} [filters.limit=50]
 * @param {string} [filters.sortBy='timestamp']
 * @param {string} [filters.sortOrder='desc']
 * @param {object|null} [filters.req]
 * @param {object|null} [filters.AuditLogModel]
 * @returns {Promise<object>} returns { total, page, limit, logs }
 */
const getAuditLogs = async (filters = {}) => {
  const {
    userId,
    farmId,
    action,
    entityType,
    severity,
    status,
    startDate,
    endDate,
    page = 1,
    limit = 50,
    sortBy = 'timestamp',
    sortOrder = 'desc',
    req = null,
    AuditLogModel = null
  } = filters;

  try {
    const AuditModel = AuditLogModel || req?.farmModels?.AuditLog || DefaultAuditLog;
    if (!AuditModel) {
      logger.warn('No AuditLog model available for getAuditLogs.');
      return { total: 0, page, limit, logs: [] };
    }

    const query = {};
    if (userId) query.userId = userId;
    if (farmId) query.farmId = farmId;
    if (action) query.action = action;
    if (entityType) query.entityType = entityType;
    if (severity) query.severity = severity;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(Math.max(1, Number(limit) || 50), 200);
    const skip = (pageNumber - 1) * pageSize;

    const [total, logs] = await Promise.all([
      AuditModel.countDocuments(query),
      AuditModel.find(query)
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(pageSize)
        .lean()
    ]);

    return {
      total,
      page: pageNumber,
      limit: pageSize,
      logs
    };
  } catch (error) {
    logger.error('Error fetching audit logs', {
      message: error?.message || 'Unknown error',
      stack: error?.stack
    });
    return { total: 0, page, limit, logs: [] };
  }
};

module.exports = {
  createAuditLog,
  auditMiddleware,
  getAuditLogs,
  logAudit
};
