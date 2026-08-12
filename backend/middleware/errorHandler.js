const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

const isProduction = process.env.NODE_ENV === 'production';
const SAFE_HEADER_NAMES = new Set([
  'accept',
  'content-type',
  'user-agent',
  'x-request-id',
  'x-forwarded-for',
  'referer',
  'host'
]);

const ERROR_CODE_MAP = {
  CastError: 'INVALID_RESOURCE_ID',
  ValidationError: 'VALIDATION_FAILED',
  MongoNetworkError: 'DATABASE_UNAVAILABLE',
  MongoServerSelectionError: 'DATABASE_UNAVAILABLE',
  JsonWebTokenError: 'AUTH_INVALID_TOKEN',
  TokenExpiredError: 'AUTH_TOKEN_EXPIRED',
  SyntaxError: 'MALFORMED_JSON',
  MulterError: 'FILE_UPLOAD_FAILED',
  RateLimitError: 'RATE_LIMIT_EXCEEDED'
};

const STATUS_CODE_ERROR_MAP = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'RATE_LIMIT_EXCEEDED',
  500: 'INTERNAL_SERVER_ERROR'
};

/**
 * Extract safe headers from the request.
 *
 * @param {object} headers
 * @returns {object}
 */
const getSafeHeaders = (headers = {}) => {
  const safeHeaders = {};

  for (const headerKey of Object.keys(headers)) {
    const lowered = headerKey.toLowerCase();
    if (SAFE_HEADER_NAMES.has(lowered)) {
      safeHeaders[lowered] = headers[headerKey];
    }
  }

  return safeHeaders;
};

/**
 * Return a stable request ID if present.
 *
 * @param {object} req
 * @returns {string|null}
 */
const getRequestId = (req) => {
  if (req?.requestId) {
    return String(req.requestId);
  }

  if (req?.id) {
    return String(req.id);
  }

  if (req?.headers?.['x-request-id']) {
    return String(req.headers['x-request-id']);
  }

  return null;
};

/**
 * Build a lightweight request context for error logging and response metadata.
 *
 * @param {object} req
 * @returns {object}
 */
const getRequestContext = (req) => ({
  requestId: getRequestId(req),
  path: req?.originalUrl || req?.url || null,
  method: req?.method || null,
  ip: req?.ip || req?.connection?.remoteAddress || null,
  userId: req?.user?.id || null,
  farmId: req?.user?.farmId || null,
  headers: getSafeHeaders(req?.headers || {}),
  executionTimeMs: typeof req?._startAt === 'object' && req._startAt ? Math.round((Date.now() - req._startAt) / 1) : null
});

/**
 * Convert error type into a stable service-level error code.
 *
 * @param {Error} error
 * @returns {string}
 */
const resolveErrorCode = (error) => {
  if (error?.errorCode && typeof error.errorCode === 'string') {
    return error.errorCode;
  }

  if (error?.name && ERROR_CODE_MAP[error.name]) {
    return ERROR_CODE_MAP[error.name];
  }

  if (error?.code === 11000) {
    return 'DUPLICATE_RECORD';
  }

  if (error?.statusCode && STATUS_CODE_ERROR_MAP[error.statusCode]) {
    return STATUS_CODE_ERROR_MAP[error.statusCode];
  }

  if (error?.statusCode === 429 || error?.name === 'RateLimitError' || error?.code === 'ERR_RATE_LIMIT') {
    return 'RATE_LIMIT_EXCEEDED';
  }

  return 'INTERNAL_SERVER_ERROR';
};

/**
 * Build a structured API error payload.
 *
 * @param {object} errorInfo
 * @param {object} requestContext
 * @returns {object}
 */
const buildErrorResponse = (errorInfo, requestContext) => ({
  success: false,
  statusCode: errorInfo.statusCode,
  errorCode: errorInfo.errorCode,
  message: errorInfo.message,
  errors: errorInfo.errors || {},
  timestamp: new Date().toISOString(),
  requestId: requestContext.requestId,
  path: requestContext.path,
  method: requestContext.method,
  ...(isProduction ? {} : { stack: errorInfo.stack })
});

/**
 * Convert a Mongoose ValidationError into a field-level map.
 *
 * @param {object} error
 * @returns {object}
 */
const normalizeMongooseValidationErrors = (error) => {
  const fieldErrors = {};

  if (!error?.errors || typeof error.errors !== 'object') {
    return fieldErrors;
  }

  for (const [field, child] of Object.entries(error.errors)) {
    fieldErrors[field] = child?.message || String(child);
  }

  return fieldErrors;
};

/**
 * Determine whether an error is a syntactic JSON parse failure.
 *
 * @param {Error} error
 * @returns {boolean}
 */
const isBadJsonSyntaxError = (error) => {
  return (
    error?.name === 'SyntaxError' &&
    (error?.status === 400 || error?.type === 'entity.parse.failed' || /JSON/.test(error?.message || ''))
  );
};

/**
 * Normalize known errors into an ApiError instance.
 *
 * @param {Error} rawError
 * @returns {ApiError}
 */
const normalizeError = (rawError) => {
  if (rawError instanceof ApiError) {
    return rawError;
  }

  const name = rawError?.name;
  const code = rawError?.code;
  const statusCode = Number(rawError?.statusCode) || 500;

  if (name === 'CastError') {
    return new ApiError(400, 'Invalid resource identifier provided.', { field: rawError.path, value: rawError.value }, true, 'INVALID_RESOURCE_ID');
  }

  if (name === 'ValidationError') {
    return new ApiError(400, 'Validation failed.', normalizeMongooseValidationErrors(rawError), true, 'VALIDATION_FAILED');
  }

  if (code === 11000) {
    return new ApiError(409, 'Duplicate record exists.', { fields: rawError.keyValue || {} }, true, 'DUPLICATE_RECORD');
  }

  if (isBadJsonSyntaxError(rawError)) {
    return new ApiError(400, 'Malformed JSON payload.', null, true, 'MALFORMED_JSON');
  }

  if (name === 'JsonWebTokenError') {
    return new ApiError(401, 'Authentication token is invalid.', null, true, 'AUTH_INVALID_TOKEN');
  }

  if (name === 'TokenExpiredError') {
    return new ApiError(401, 'Authentication token has expired.', null, true, 'AUTH_TOKEN_EXPIRED');
  }

  if (name === 'MulterError') {
    return new ApiError(400, rawError.message || 'File upload failed.', null, true, 'FILE_UPLOAD_FAILED');
  }

  if (name === 'MongoNetworkError' || name === 'MongoServerSelectionError') {
    return new ApiError(503, 'Unable to reach the database at this time.', null, true, 'DATABASE_UNAVAILABLE');
  }

  if (statusCode === 429 || name === 'RateLimitError' || code === 'ERR_RATE_LIMIT') {
    return new ApiError(429, 'Too many requests. Please try again later.', { retryAfter: rawError?.retryAfter || null }, true, 'RATE_LIMIT_EXCEEDED');
  }

  if (statusCode >= 400 && statusCode < 500) {
    const codeLabel = STATUS_CODE_ERROR_MAP[statusCode] || 'BAD_REQUEST';
    return new ApiError(statusCode, rawError?.message || 'Bad request.', rawError?.errors || null, true, codeLabel);
  }

  return new ApiError(500, 'Internal Server Error', null, false, 'INTERNAL_SERVER_ERROR');
};

/**
 * Format log metadata for errors without leaking sensitive contents.
 *
 * @param {ApiError} error
 * @param {object} requestContext
 * @returns {object}
 */
const buildLogMeta = (error, requestContext) => ({
  ...requestContext,
  statusCode: error.statusCode,
  errorCode: resolveErrorCode(error),
  message: error.message,
  isOperational: error.isOperational,
  stack: error.stack
});

/**
 * Global Express error handler.
 *
 * @param {Error} err
 * @param {object} req
 * @param {object} res
 * @param {function} next
 */
const errorHandler = (err, req, res, next) => {
  const requestContext = getRequestContext(req);

  if (res.headersSent) {
    logger.error('Headers already sent while handling error.', {
      ...requestContext,
      stack: err?.stack
    });
    return next(err);
  }

  const normalizedError = normalizeError(err);
  const responsePayload = buildErrorResponse({
    statusCode: normalizedError.statusCode,
    errorCode: normalizedError.errorCode || resolveErrorCode(normalizedError),
    message: isProduction && !normalizedError.isOperational ? 'Internal Server Error' : normalizedError.message,
    errors: normalizedError.errors,
    stack: normalizedError.stack
  }, requestContext);

  const logMeta = buildLogMeta(normalizedError, requestContext);

  if (normalizedError.statusCode >= 500) {
    logger.error('Unhandled application error.', logMeta);
  } else {
    logger.warn('Operational error returned to client.', logMeta);
  }

  return res.status(normalizedError.statusCode).json(responsePayload);
};

/**
 * Wrap async route handlers and proxy exceptions to Express.
 *
 * @param {function} fn
 * @returns {function}
 */
const asyncHandler = (fn) => {
  if (typeof fn !== 'function') {
    throw new TypeError('asyncHandler requires a function');
  }

  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  asyncHandler
};
