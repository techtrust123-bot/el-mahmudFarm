/**
 * Request Logger Middleware
 * Logs all API requests for debugging and monitoring
 */

const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          (info) => `${info.timestamp} [${info.level}] ${info.message}`
        )
      )
    }),
    new (require('winston-daily-rotate-file'))({
      filename: 'logs/requests-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

/**
 * Middleware to log API requests
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Store original end function
  const originalEnd = res.end;

  // Override end function to capture response
  res.end = function (...args) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous',
      farmId: req.user?.farmId || 'N/A',
      timestamp: new Date().toISOString()
    };

    // Log at different levels based on status code
    if (statusCode >= 500) {
      logger.error('API Request Error', logData);
    } else if (statusCode >= 400) {
      logger.warn('API Request Warning', logData);
    } else {
      logger.info(`API Request: ${req.method} ${req.originalUrl}`, logData);
    }

    // Call original end
    originalEnd.apply(res, args);
  };

  next();
};

module.exports = requestLogger;
