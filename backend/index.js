const path = require('path');
const dotenv = require('dotenv');
dotenv.config();
// dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const MongoStore = require('rate-limit-mongo');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const compression = require('compression');
const winston = require('winston');
const morgan = require('morgan');
const DailyRotateFile = require('winston-daily-rotate-file');
const { resolveSrvMongoUri } = require('./utils/dbManager');
// require('../services/scheduleBackup');

const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
// const index = require('./routes/index.js');
// const {router} = require('./routes/index.js')
const cookie = require('cookie-parser');


process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cloudfarm_main';

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'FRONTEND_URL'];
requiredEnvVars.forEach(key => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

// Logger setup - must be before database connection
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const dailyRotateFileTransport = new DailyRotateFile({
  filename: 'logs/security-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d'
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    dailyRotateFileTransport
  ]
});

// Connect to main database for auth
(async () => {
  try {
    const mongoUri =
      await resolveSrvMongoUri(
        process.env.MONGO_URI
      );

    await mongoose.connect(mongoUri);

    logger.info('Main database connected');
  } catch (err) {
    logger.error(
      'Main database connection error:',
      err
    );
    process.exit(1);
  }
})();
// (async () => {
//   try {
//     const mongoUri = await mongoose.connect(process.env.MONGO_URI);
//     logger.info('Main database connected');
//   } catch (err) {
//     logger.error('Main database connection error:', err);
//     process.exit(1);
//   }
// })();

const app = express();

// Trust proxy if behind load balancer
app.set('trust proxy', 1);

// CORS configuration - must be applied early
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// Morgan middleware for HTTP request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => {
      logger.info('HTTP Request', {
        message: message.trim(),
        level: 'info'
      });
    }
  }
}));

// Custom request logger middleware
const requestLogger = require('./middleware/requestLogger');
app.use(requestLogger);

// Trust proxy for rate limiting behind load balancer
app.set('trust proxy', 1);

// Disable X-Powered-By header
app.disable('x-powered-by');

// Compression middleware
app.use(compression());

// Helmet security headers
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    frameSrc: ["'none'"],
  }
}));
app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));
app.use(helmet.noSniff());
app.use(helmet.frameguard({ action: 'deny' }));
app.use(helmet.xssFilter());

// Rate limiting
const globalLimiter = rateLimit({
  store: new MongoStore({
    uri: process.env.MONGO_URI,
    collectionName: 'rateLimits',
    expireTimeMs: 10 * 60 * 1000, // 10 minutes
  }),
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 150, // limit each IP to 150 requests per windowMs
  message: { success: false, message: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip OPTIONS and the specific create routes for poultry and livestock
  skip: (req) => {
    if (req.method === 'OPTIONS') return true;
    const path = req.path || req.originalUrl || '';
    const allowedCreateRoutes = [
      '/api/poultry/add-poultry',
      '/api/livestock/add-animal'
    ];
    if (req.method === 'POST' && allowedCreateRoutes.includes(path)) {
      return true;
    }
    return false;
  },
});

const authLimiter = rateLimit({
  store: new MongoStore({
    uri: process.env.MONGO_URI,
    collectionName: 'authRateLimits',
    expireTimeMs: 5 * 60 * 1000, // 5 minutes
  }),
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // Allow 30 auth attempts per 5 minutes
  message: { success: false, message: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS', // Skip OPTIONS requests
});

const otpLimiter = rateLimit({
  store: new MongoStore({
    uri: process.env.MONGO_URI,
    collectionName: 'otpRateLimits',
    expireTimeMs: 10 * 60 * 1000,
  }),
  windowMs: 10 * 60 * 1000,
  max: 3,
  message: { success: false, message: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS', // Skip OPTIONS requests
});

// Apply rate limiters
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/verify-otp', otpLimiter);
app.use('/api/auth/reset-password', otpLimiter);
app.use(globalLimiter);

// Body parsing with size limits
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }))
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Data sanitization
app.use(mongoSanitize());
app.use(xss());

// Cookie parser
app.use(cookie());

// Routes
app.use('/api', require('./routes/index.js'));

// Global error handler - must be last
const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);

// 404 handler
// app.use('*', (req, res) => {
//   res.status(404).json({ success: false, message: 'Route not found' });
// });

require('./jobs/feedRecalculationJob');
require('./jobs/backupJob');

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`)
        console.log('Run: taskkill /F /IM node.exe  then restart')
        process.exit(1)  // ✅ exit cleanly so nodemon can restart
    } else {
        console.error('Server error:', error)
        process.exit(1)
    }
})

// Graceful shutdown
const { closeAllConnections } = require('./utils/dbManager');
process.on('SIGINT', async () => {
    console.log('\n🔌 Shutting down gracefully...')
    server.close(async () => {
        await closeAllConnections()  // close all farm DB connections
        await mongoose.connection.close()  // close main DB
        console.log('✅ All connections closed')
        process.exit(0)
    })
})

// process.on('SIGINT', async () => {
//   logger.info('Received SIGINT, shutting down gracefully...');

//   // Close all farm connections
//   await closeAllConnections();

//   // Close main mongoose connection
//   await mongoose.connection.close();

//   // Close server
//   server.close(() => {
//     logger.info('Server closed');
//     process.exit(0);
//   });
// });

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');

  // Close all farm connections
  await closeAllConnections();

  // Close main mongoose connection
  await mongoose.connection.close();

  // Close server
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});