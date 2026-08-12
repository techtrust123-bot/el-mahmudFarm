const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');

const logDirectory = path.join(__dirname, '..', 'logs');

if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory, { recursive: true });
}

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),

  // This handle were logs were sent
  transports: [
    // show logs in terminal
    new transports.Console({
      format: format.combine(
        // change info color
        format.colorize(),
        format.printf(({ level, message, timestamp, ...meta }) => {
          // this check wether extra info exist
          const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${level}]: ${message} ${metaString}`;
        })
      )
    }),
    new transports.File({ filename: path.join(logDirectory, 'application.log'), level: 'info' }),
    new transports.File({ filename: path.join(logDirectory, 'error.log'), level: 'error' })
  ],
  exceptionHandlers: [
    new transports.File({ filename: path.join(logDirectory, 'exceptions.log') })
  ],
  rejectionHandlers: [
    new transports.File({ filename: path.join(logDirectory, 'rejections.log') })
  ]
});

module.exports = logger;
