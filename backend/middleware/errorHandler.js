/**
 * Global Error Handler Middleware
 * Should be used after all route handlers
 */
const ApiError = require('../utils/ApiError');
const winston = require('winston');



const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * Global error handler middleware
 * Must be the last middleware in the chain
 */
const errorHandler = (
  err,
  req,
  res,
  next
) => {
  let error = err;

  if (error.name === 'CastError') {
    error = new ApiError(400, 'Invalid resource ID');
  }

  if (error.code === 11000) {
    error = new ApiError(409, 'Record already exists');
  }

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    const errors = error.errors || null;
    error = new ApiError(statusCode, message, errors, false);
  }

  error.timestamp = error.timestamp || new Date().toISOString();

  logger.error(error);

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
    errors: error.errors || null,
    timestamp: error.timestamp,
    ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {})
  });
};
// const errorHandler = (err, req, res, next) => {
//   let error = err;

//   // Log the error
//   logger.error('Error occurred:', {
//     message: error.message,
//     statusCode: error.statusCode || 500,
//     stack: error.stack,
//     url: req.originalUrl,
//     method: req.method,
//     ip: req.ip,
//     userId: req.user?.id || 'anonymous'
//   });

//   // If error is not an instance of ApiError, convert it
//   if (!(error instanceof ApiError)) {
//     const statusCode = error.statusCode || 500;
//     if(!error.isOperational) {
//       error.message = 'Internal Server Error';
//     }
//     // const message = error.message || 'Internal Server Error';
//     error = new ApiError(statusCode, message, null, false);
//   }

//   // Send error response
//   const response = {
//     success: false,
//     statusCode: error.statusCode,
//     message: error.message,
//     errors: error.errors,
//     timestamp: error.timestamp
//   };

//   // Don't send stack trace in production
//   if (process.env.NODE_ENV === 'development') {
//     response.stack = error.stack;
//   }

//   res.status(error.statusCode).json(response);
// };

/**
 * Async handler wrapper - wraps async route handlers to catch errors
 * Usage: router.get('/route', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  asyncHandler
};
