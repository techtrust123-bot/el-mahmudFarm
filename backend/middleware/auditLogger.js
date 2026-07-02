/**
 * Audit Logging Middleware
 * Tracks all CRUD operations on farm data
 */

const AuditLog = require('../models/auditLog');

/**
 * Log audit event
 */
const logAudit = async (auditData) => {
  try {
    const audit = new AuditLog(auditData);
    await audit.save();
  } catch (error) {
    console.error('Error logging audit:', error);
    // Don't throw - audit logging shouldn't block operations
  }
};

/**
 * Create audit log entry
 * @param {string} action - CREATE, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, BACKUP
 * @param {string} entityType - livestock, poultry, feed, sales, expense, staff
 * @param {object} options - { userId, farmId, entityId, before, after, req, status, error }
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
    error = null
  } = options;

  const auditData = {
    userId,
    farmId,
    action,
    entityType,
    entityId,
    changes: {
      before,
      after
    },
    ipAddress: req?.ip || null,
    userAgent: req?.get('User-Agent') || null,
    status,
    errorMessage: error?.message || null,
    timestamp: new Date()
  };

  await logAudit(auditData);
};

/**
 * Middleware to automatically log route changes
 */
const auditMiddleware = (action, entityType) => {
  return async (req, res, next) => {
    // Store original res.json function
    const originalJson = res.json;

    res.json = function (data) {
      // Check if request was successful
      if (data.success !== false && (res.statusCode < 300 || res.statusCode === 400)) {
        // Log the audit after response
        const auditData = {
          userId: req.user?.id,
          farmId: req.user?.farmId,
          action,
          entityType,
          entityId: req.params.id || data.data?._id || null,
          changes: {
            after: data.data
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          status: res.statusCode < 400 ? 'SUCCESS' : 'FAILED',
          errorMessage: !data.success ? data.message : null
        };

        logAudit(auditData);
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Get audit logs for a user/farm
 */
const getAuditLogs = async (filters = {}) => {
  try {
    const query = {};
    if (filters.userId) query.userId = filters.userId;
    if (filters.farmId) query.farmId = filters.farmId;
    if (filters.action) query.action = filters.action;
    if (filters.entityType) query.entityType = filters.entityType;
    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
      if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
    }

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(filters.limit || 100)
      .populate('userId', 'name email');

    return logs;
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
};

module.exports = {
  createAuditLog,
  auditMiddleware,
  getAuditLogs,
  logAudit
};
