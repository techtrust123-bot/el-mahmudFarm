/**
 * Request Logger Middleware
 * Logs all API requests for debugging and monitoring
 */

// const winston = require('winston');

// const logger = winston.createLogger({
//   level: 'info',
//   format: winston.format.combine(
//     winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
//     winston.format.json()
//   ),
//   transports: [
//     new winston.transports.Console({
//       format: winston.format.combine(
//         winston.format.colorize(),
//         winston.format.printf(
//           (info) => `${info.timestamp} [${info.level}] ${info.message}`
//         )
//       )
//     }),
//     new (require('winston-daily-rotate-file'))({
//       filename: 'logs/requests-%DATE%.log',
//       datePattern: 'YYYY-MM-DD',
//       maxSize: '20m',
//       maxFiles: '14d'
//     })
//   ]
// });

const { randomUUID } = require('crypto');
const logger = require('../utils/logger');

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const REQUEST_LOGGER_ENABLED = String(process.env.REQUEST_LOGGER_ENABLED ?? 'true').toLowerCase() === 'true';
const REQUEST_LOG_BODY = String(process.env.REQUEST_LOG_BODY ?? 'false').toLowerCase() === 'true';
const REQUEST_LOG_RESPONSE = String(process.env.REQUEST_LOG_RESPONSE ?? 'true').toLowerCase() === 'true';
const REQUEST_SLOW_MS = Number(process.env.REQUEST_SLOW_MS) || 1000;
const REQUEST_MAX_BODY_SIZE = Number(process.env.REQUEST_MAX_BODY_SIZE) || 5000;
const REQUEST_RECENT_REQUESTS_MAX = Number(process.env.REQUEST_RECENT_REQUESTS_MAX) || 200;
const REQUEST_LOGGER_IGNORED_ROUTES = String(process.env.REQUEST_LOGGER_IGNORED_ROUTES || '/health,/favicon.ico,/metrics');

const SENSITIVE_KEYS = new Set([
  'password',
  'confirmpassword',
  'otp',
  'token',
  'authorization',
  'cookie',
  'jwt',
  'refreshtoken',
  'creditcard',
  'credit_card',
  'bankaccount',
  'bank_account',
  'secret',
  'apikey',
  'api_key',
  'accesskey',
  'access_key'
]);

const metrics = {
  totalRequests: 0,
  totalResponseTime: 0,
  slowRequests: 0,
  fourXxCount: 0,
  fiveXxCount: 0,
  lastRequestTime: null
};

const ignoredRoutePatterns = REQUEST_LOGGER_IGNORED_ROUTES
  .split(',')
  .map((route) => route.trim())
  .filter(Boolean)
  .map((route) => ({
    value: route.replace(/\*+$/, ''),
    prefix: route.endsWith('*')
  }));

/**
 * Returns the current request metrics for monitoring dashboards and health checks.
 *
 * @returns {{totalRequests:number,averageResponseTime:number,slowRequests:number,4xxCount:number,5xxCount:number,lastRequestTime:string|null}}
 */
const getRequestMetrics = () => ({
  totalRequests: metrics.totalRequests,
  averageResponseTime: metrics.totalRequests ? Math.round(metrics.totalResponseTime / metrics.totalRequests) : 0,
  slowRequests: metrics.slowRequests,
  '4xxCount': metrics.fourXxCount,
  '5xxCount': metrics.fiveXxCount,
  lastRequestTime: metrics.lastRequestTime
});

/**
 * Resets the current monitoring metrics to initial state.
 */
const resetRequestMetrics = () => {
  metrics.totalRequests = 0;
  metrics.totalResponseTime = 0;
  metrics.slowRequests = 0;
  metrics.fourXxCount = 0;
  metrics.fiveXxCount = 0;
  metrics.lastRequestTime = null;
};

/**
 * Checks whether the request path should bypass logging.
 *
 * @param {string} path
 * @returns {boolean}
 */
const isIgnoredRoute = (path = '') => {
  const normalizedPath = path.split('?')[0] || '';
  return ignoredRoutePatterns.some((pattern) =>
    pattern.prefix ? normalizedPath.startsWith(pattern.value) : normalizedPath === pattern.value
  );
};

/**
 * Computes a safe candidate for request body logging.
 * Only JSON payloads under the configured limit are considered.
 *
 * @param {import('express').Request} req
 * @returns {boolean}
 */
const canLogRequestBody = (req) => {
  if (!REQUEST_LOG_BODY) {
    return false;
  }

  if (req.file || req.files) {
    return false;
  }

  if (typeof req.is !== 'function' || !req.is('application/json')) {
    return false;
  }

  if (!req.body || typeof req.body !== 'object' || Buffer.isBuffer(req.body)) {
    return false;
  }

  const bodySize = calculateBodySize(req.body);
  return bodySize > 0 && bodySize <= REQUEST_MAX_BODY_SIZE;
};

/**
 * Generates or reuses a request correlation identifier.
 * Storing the ID on the request helps attach logs to traces.
 *
 * @param {import('express').Request} req
 * @returns {string}
 */
const resolveRequestId = (req) => {
  const incomingId = String(req.headers?.['x-request-id'] || '').trim();
  return incomingId || randomUUID();
};

/**
 * Recursively sanitizes a value for logging to avoid leaking secrets.
 *
 * @param {*} value
 * @returns {*} sanitized value
 */
const sanitizePayload = (value) => {
  if (Array.isArray(value)) {
    return value.map(sanitizePayload);
  }

  if (value && typeof value === 'object' && !Buffer.isBuffer(value)) {
    return Object.keys(value).reduce((result, key) => {
      const normalizedKey = String(key).replace(/[-_\s]/g, '').toLowerCase();
      result[key] = SENSITIVE_KEYS.has(normalizedKey) ? '[REDACTED]' : sanitizePayload(value[key]);
      return result;
    }, {});
  }

  return value;
};

/**
 * Computes an approximate size for a payload in bytes.
 *
 * @param {*} payload
 * @returns {number}
 */
const calculateBodySize = (payload) => {
  if (payload == null) {
    return 0;
  }

  if (Buffer.isBuffer(payload)) {
    return payload.length;
  }

  if (typeof payload === 'string') {
    return Buffer.byteLength(payload, 'utf8');
  }

  try {
    return Buffer.byteLength(JSON.stringify(payload), 'utf8');
  } catch {
    return 0;
  }
};

/**
 * Builds the structured JSON payload that will be logged for each request.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {object} details
 * @returns {object}
 */
const buildLogEntry = (req, res, details) => ({
  requestId: details.requestId,
  timestamp: details.timestamp,
  environment: NODE_ENV,
  pid: process.pid,
  method: req.method,
  originalUrl: req.originalUrl,
  baseUrl: req.baseUrl || null,
  route: req.route?.path || null,
  params: req.params || {},
  query: req.query || {},
  statusCode: res.statusCode,
  durationMs: details.durationMs,
  responseSize: details.responseSize,
  success: res.statusCode < 400,
  ip: req.ip || null,
  forwardedFor: req.headers?.['x-forwarded-for'] || null,
  hostname: req.hostname || null,
  protocol: req.protocol || null,
  userAgent: req.get?.('User-Agent') || null,
  referer: req.get?.('Referer') || null,
  farmId: req.user?.farmId || null,
  tenantId: req.user?.tenantId || null,
  managerId: req.user?.managerId || null,
  userId: req.user?.id || null,
  userRole: req.user?.role || null,
  requestBody: details.requestBody,
  errorCode: details.errorCode || null,
  slowThresholdMs: REQUEST_SLOW_MS
});

/**
 * Maps response status codes to Winston log levels.
 *
 * @param {number} statusCode
 * @returns {'error'|'warn'|'info'}
 */
const resolveLogLevel = (statusCode) => {
  if (statusCode >= 500) {
    return 'error';
  }

  if (statusCode >= 400) {
    return 'warn';
  }

  return 'info';
};

/**
 * Writes a log entry safely without impacting request flow.
 *
 * @param {'error'|'warn'|'info'|'debug'} level
 * @param {string} message
 * @param {object} meta
 */
const writeLog = (level, message, meta) => {
  try {
    if (typeof logger[level] === 'function') {
      logger[level](message, meta);
    } else {
      logger.info(message, meta);
    }
  } catch (error) {
    try {
      logger.error('Request logger failure', { requestId: meta?.requestId, message: error.message, stack: error.stack });
    } catch (_) {
      // Swallow failures to avoid crashing the request pipeline.
    }
  }
};

/**
 * Updates in-memory request metrics used by monitoring helpers.
 *
 * @param {number} durationMs
 * @param {number} statusCode
 */
const updateMetrics = (durationMs, statusCode) => {
  metrics.totalRequests += 1;
  metrics.totalResponseTime += durationMs;
  metrics.lastRequestTime = new Date().toISOString();

  if (durationMs >= REQUEST_SLOW_MS) {
    metrics.slowRequests += 1;
  }

  if (statusCode >= 500) {
    metrics.fiveXxCount += 1;
  } else if (statusCode >= 400) {
    metrics.fourXxCount += 1;
  }
};

/**
 * Express middleware for structured request logging.
 *
 * This middleware attaches a request correlation ID to every call, intercepts
 * response write/send/json/end methods to compute size and duration, and emits
 * JSON structured logs through the shared Winston logger.
 *
 * It is intentionally lightweight, non-blocking, and restores original response
 * methods after the response lifecycle completes.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const requestLogger = (req, res, next) => {
  if (!REQUEST_LOGGER_ENABLED) {
    return next();
  }

  if (isIgnoredRoute(req.path || req.originalUrl)) {
    return next();
  }

  const requestId = resolveRequestId(req);
  req.requestId = requestId;
  req._startAt = Date.now();
  res.setHeader('X-Request-ID', requestId);

  const startedAt = process.hrtime.bigint();
  let responseSize = 0;
  let responseLogged = false;

  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  const captureResponseSize = (payload, encoding) => {
    if (payload == null) {
      return;
    }

    if (typeof payload === 'string') {
      responseSize += Buffer.byteLength(payload, encoding || 'utf8');
      return;
    }

    if (Buffer.isBuffer(payload)) {
      responseSize += payload.length;
      return;
    }

    if (typeof payload === 'object') {
      responseSize += calculateBodySize(payload);
    }
  };

  res.write = function (chunk, encoding, callback) {
    try {
      captureResponseSize(chunk, encoding);
    } catch (error) {
      logger.debug('Failed to capture response write size', { requestId, error: error.message });
    }

    return originalWrite(chunk, encoding, callback);
  };

  res.end = function (chunk, encoding, callback) {
    try {
      captureResponseSize(chunk, encoding);
    } catch (error) {
      logger.debug('Failed to capture response end size', { requestId, error: error.message });
    }

    return originalEnd(chunk, encoding, callback);
  };

  res.json = function (body) {
    try {
      if (responseSize === 0) {
        responseSize = calculateBodySize(body);
      }
    } catch (error) {
      logger.debug('Failed to capture JSON payload size', { requestId, error: error.message });
    }

    return originalJson(body);
  };

  res.send = function (body) {
    try {
      if (responseSize === 0) {
        responseSize = calculateBodySize(body);
      }
    } catch (error) {
      logger.debug('Failed to capture send payload size', { requestId, error: error.message });
    }

    return originalSend(body);
  };

  const restoreResponseMethods = () => {
    res.write = originalWrite;
    res.end = originalEnd;
    res.json = originalJson;
    res.send = originalSend;
  };

  const logRequest = () => {
    if (responseLogged) {
      return;
    }

    responseLogged = true;
    restoreResponseMethods();

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const roundedDuration = Math.round(durationMs);
    const statusCode = res.statusCode || 200;

    if (!responseSize) {
      const headerLength = res.getHeader('Content-Length');
      responseSize = Number(headerLength) || responseSize;
    }

    const requestBody = canLogRequestBody(req) ? sanitizePayload(req.body) : undefined;
    const entry = buildLogEntry(req, res, {
      requestId,
      timestamp: new Date().toISOString(),
      durationMs: roundedDuration,
      responseSize,
      requestBody
    });

    updateMetrics(roundedDuration, statusCode);

    const level = resolveLogLevel(statusCode);
    writeLog(level, 'API request completed', entry);

    if (roundedDuration >= REQUEST_SLOW_MS) {
      writeLog('warn', 'Slow API request detected', entry);
    }
  };

  res.once('finish', logRequest);
  res.once('close', logRequest);

  next();
};

requestLogger.getRequestMetrics = getRequestMetrics;
requestLogger.resetRequestMetrics = resetRequestMetrics;

module.exports = requestLogger;
