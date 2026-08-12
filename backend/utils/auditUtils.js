const logger = require('./logger');

const DEFAULT_MAX_PAYLOAD_BYTES = Number(process.env.AUDIT_MAX_PAYLOAD_BYTES) || 64 * 1024;
const SENSITIVE_FIELDS = [
  'password',
  'confirmPassword',
  'token',
  'jwt',
  'otp',
  'refreshToken',
  'cookies',
  'cookie',
  'authorization'
];

const ACTION_SEVERITY = {
  CREATE: 'INFO',
  UPDATE: 'INFO',
  DELETE: 'WARNING',
  LOGIN: 'INFO',
  LOGOUT: 'INFO',
  EXPORT: 'WARNING',
  BACKUP: 'WARNING',
  RESTORE: 'CRITICAL',
  ROLE_CHANGE: 'CRITICAL',
  PASSWORD_RESET: 'WARNING',
  BACKUP_CLEANUP: 'WARNING',
  VIEW: 'INFO'
};

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function isSensitiveKey(key) {
  if (!key || typeof key !== 'string') return false;
  const normalized = key.toLowerCase();
  return SENSITIVE_FIELDS.some((field) => normalized === field || normalized.includes(field));
}

function sanitizeAuditData(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditData(item));
  }

  if (isPlainObject(value)) {
    const sanitized = {};

    for (const [key, childValue] of Object.entries(value)) {
      if (isSensitiveKey(key)) {
        continue;
      }

      if (typeof childValue === 'string' || typeof childValue === 'number' || typeof childValue === 'boolean' || childValue === null) {
        sanitized[key] = childValue;
      } else if (Array.isArray(childValue) || isPlainObject(childValue)) {
        sanitized[key] = sanitizeAuditData(childValue);
      } else {
        sanitized[key] = childValue;
      }
    }

    return sanitized;
  }

  return value;
}

function deepCompare(a, b) {
  if (a === b) {
    return true;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepCompare(item, b[index]));
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => deepCompare(a[key], b[key]));
  }

  return false;
}

function collectChanges(beforeValue, afterValue) {
  if (deepCompare(beforeValue, afterValue)) {
    return null;
  }

  if (isPlainObject(beforeValue) && isPlainObject(afterValue)) {
    const beforeDiff = {};
    const afterDiff = {};
    const keys = new Set([...Object.keys(beforeValue), ...Object.keys(afterValue)]);

    for (const key of keys) {
      const beforeChild = beforeValue[key];
      const afterChild = afterValue[key];
      const nestedChanges = collectChanges(beforeChild, afterChild);

      if (nestedChanges) {
        if (nestedChanges.before !== undefined) {
          beforeDiff[key] = nestedChanges.before;
        }
        if (nestedChanges.after !== undefined) {
          afterDiff[key] = nestedChanges.after;
        }
      }
    }

    if (Object.keys(beforeDiff).length || Object.keys(afterDiff).length) {
      return {
        before: beforeDiff,
        after: afterDiff
      };
    }

    return null;
  }

  if (Array.isArray(beforeValue) && Array.isArray(afterValue)) {
    return {
      before: sanitizeAuditData(beforeValue),
      after: sanitizeAuditData(afterValue)
    };
  }

  return {
    before: sanitizeAuditData(beforeValue),
    after: sanitizeAuditData(afterValue)
  };
}

function getChangedFields(before, after) {
  if (before == null && after == null) {
    return null;
  }

  if (before == null && after != null) {
    return {
      before: null,
      after: sanitizeAuditData(after)
    };
  }

  if (before != null && after == null) {
    return {
      before: sanitizeAuditData(before),
      after: null
    };
  }

  const changes = collectChanges(before, after);

  if (changes && (Object.keys(changes.before || {}).length || Object.keys(changes.after || {}).length)) {
    return changes;
  }

  return {
    before: null,
    after: sanitizeAuditData(after)
  };
}

function detectSeverity(action = '') {
  const normalizedAction = String(action).toUpperCase();
  if (ACTION_SEVERITY[normalizedAction]) {
    return ACTION_SEVERITY[normalizedAction];
  }

  if (normalizedAction.includes('DELETE')) return 'WARNING';
  if (normalizedAction.includes('RESTORE') || normalizedAction.includes('ROLE_CHANGE')) return 'CRITICAL';
  if (normalizedAction.includes('EXPORT') || normalizedAction.includes('BACKUP') || normalizedAction.includes('PASSWORD')) return 'WARNING';

  return 'INFO';
}

function normalizeString(value) {
  if (typeof value !== 'string') {
    return value == null ? null : String(value);
  }

  return value.trim();
}

function buildAuditDocument(options = {}) {
  const {
    action,
    entityType,
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
    maxPayloadBytes = DEFAULT_MAX_PAYLOAD_BYTES
  } = options;

  const timestamp = new Date();
  const executionDurationMs = startTime && endTime ? Math.max(0, endTime - startTime) : null;
  const method = req?.method || null;
  const url = req?.originalUrl || req?.url || null;
  const ipAddress = req?.ip || (req?.headers?.['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null);
  const userAgent = req?.get ? req.get('User-Agent') : req?.headers?.['user-agent'] || null;
  const severity = detectSeverity(action);

  const changes = getChangedFields(before, after);

  const auditDocument = {
    userId: normalizeString(userId),
    farmId: normalizeString(farmId),
    action: normalizeString(action),
    entityType: normalizeString(entityType),
    entityId: normalizeString(entityId),
    severity,
    method,
    url,
    ipAddress,
    userAgent,
    changes,
    status: normalizeString(status) || 'SUCCESS',
    errorMessage: error?.message ? String(error.message) : null,
    executionDurationMs,
    timestamp,
    payloadSize: null,
    payloadTruncated: false
  };

  try {
    const payloadString = JSON.stringify(auditDocument);
    const payloadSize = Buffer.byteLength(payloadString, 'utf8');
    auditDocument.payloadSize = payloadSize;

    if (payloadSize > maxPayloadBytes) {
      logger.warn('Audit payload exceeded max size and will be truncated.', {
        farmId,
        action,
        entityType,
        entityId,
        payloadSize,
        maxPayloadBytes
      });
      auditDocument.changes = {
        before: '[TRUNCATED_DUE_TO_SIZE]',
        after: '[TRUNCATED_DUE_TO_SIZE]'
      };
      auditDocument.payloadTruncated = true;
      auditDocument.payloadSize = Buffer.byteLength(JSON.stringify(auditDocument), 'utf8');
    }
  } catch (error) {
    logger.error('Unable to calculate audit payload size:', error);
    auditDocument.payloadSize = null;
  }

  return auditDocument;
}

module.exports = {
  sanitizeAuditData,
  detectSeverity,
  buildAuditDocument,
  getChangedFields,
  DEFAULT_MAX_PAYLOAD_BYTES
};