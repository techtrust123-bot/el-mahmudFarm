const mongoose = require('mongoose');
const dns = require('dns');
const logger = require('../utils/logger');

const MAX_CONNECTION_CACHE = Number(process.env.FARM_CONNECTION_CACHE_MAX || 500);
const MAX_FARM_ID_LENGTH = Number(process.env.FARM_ID_MAX || 64);
const FARM_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
const MONGO_URI_PATTERN = /^(mongodb(?:\+srv)?:\/\/)(?:([^@\/]+)@)?([^\/?]+)(?:\/([^?]*))?(?:\?(.*))?$/i;
const CONNECT_RETRY_MAX = Math.max(1, Number(process.env.MONGO_CONNECT_RETRY_MAX || 4));
const CONNECT_RETRY_BASE_MS = Math.max(1000, Number(process.env.MONGO_CONNECT_RETRY_BASE_MS || 1000));

const connections = new Map();
const pendingConnections = new Map();
const accessOrder = new Map();
const uriMetadataCache = new Map();
const farmUriCache = new Map();

class MongoManagerError extends Error {
  constructor(code, statusCode, message, cause) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    if (cause) this.cause = cause;
    Error.captureStackTrace(this, this.constructor);
  }
}

class InvalidMongoUriError extends MongoManagerError {
  constructor(message, cause) {
    super('INVALID_MONGO_URI', 400, message, cause);
  }
}

class InvalidFarmIdError extends MongoManagerError {
  constructor(message, cause) {
    super('INVALID_FARM_ID', 400, message, cause);
  }
}

class DatabaseConnectionError extends MongoManagerError {
  constructor(message, cause) {
    super('DATABASE_CONNECTION_ERROR', 500, message, cause);
  }
}

class ConnectionTimeoutError extends MongoManagerError {
  constructor(message, cause) {
    super('CONNECTION_TIMEOUT_ERROR', 504, message, cause);
  }
}

const normalizeFarmId = (rawFarmId) => {
  if (typeof rawFarmId !== 'string') {
    return null;
  }

  const farmId = rawFarmId.trim();
  if (!farmId || farmId.length > MAX_FARM_ID_LENGTH || !FARM_ID_PATTERN.test(farmId)) {
    return null;
  }

  return farmId;
};

const validateFarmId = (rawFarmId) => {
  const normalized = normalizeFarmId(rawFarmId);
  if (!normalized) {
    throw new InvalidFarmIdError('Farm identifier is invalid. Allowed characters are a-z, A-Z, 0-9, underscore, and hyphen.');
  }
  return normalized;
};

const touchConnection = (farmId) => {
  if (accessOrder.has(farmId)) {
    accessOrder.delete(farmId);
  }
  accessOrder.set(farmId, Date.now());
};

const evictStaleConnectionIfNeeded = async () => {
  if (connections.size <= MAX_CONNECTION_CACHE) {
    return;
  }

  const oldestFarmId = accessOrder.keys().next().value;
  if (!oldestFarmId) {
    return;
  }

  const connectionToClose = connections.get(oldestFarmId);
  accessOrder.delete(oldestFarmId);
  connections.delete(oldestFarmId);

  try {
    await connectionToClose.close();
    logger.info('Evicted farm database connection from cache', { farmId: oldestFarmId });
  } catch (error) {
    logger.warn('Failed to close evicted farm database connection', {
      farmId: oldestFarmId,
      error: error?.message
    });
  }
};

const parseMongoUri = (mongoUri) => {
  if (typeof mongoUri !== 'string' || !mongoUri.trim()) {
    throw new InvalidMongoUriError('MongoDB connection URI must be a non-empty string.');
  }

  const cached = uriMetadataCache.get(mongoUri);
  if (cached) {
    return cached;
  }

  const match = mongoUri.match(MONGO_URI_PATTERN);
  if (!match) {
    throw new InvalidMongoUriError('MongoDB URI is malformed. Expected mongodb:// or mongodb+srv:// with host(s) and a database name.');
  }

  const [, prefix, auth, hosts, database = '', query = ''] = match;

  if (!hosts || !hosts.trim()) {
    throw new InvalidMongoUriError('MongoDB URI must include one or more host entries.');
  }

  if (!database) {
    throw new InvalidMongoUriError('MongoDB URI must include a database name.');
  }

  const metadata = {
    prefix: prefix.toLowerCase(),
    auth: auth || '',
    hosts,
    database,
    query
  };

  uriMetadataCache.set(mongoUri, metadata);
  return metadata;
};

const maskQueryString = (query) => {
  if (!query) {
    return '';
  }

  return query
    .split('&')
    .map((pair) => {
      const [key] = pair.split('=');
      if (/password|pass|secret|auth|token|credential/i.test(key)) {
        return `${key}=***`;
      }
      return pair;
    })
    .join('&');
};

const maskMongoUri = (mongoUri) => {
  try {
    const { prefix, auth, hosts, database, query } = parseMongoUri(mongoUri);
    const maskedAuth = auth ? `${auth.split(':')[0]}:***@` : '';
    const maskedQuery = query ? `?${maskQueryString(query)}` : '';
    return `${prefix}${maskedAuth}${hosts}/${database}${maskedQuery}`;
  } catch (_) {
    return 'mongodb://<masked-uri>';
  }
};

const getConnectionStateLabel = (readyState) => {
  switch (readyState) {
    case 0:
      return 'disconnected';
    case 1:
      return 'connected';
    case 2:
      return 'connecting';
    case 3:
      return 'disconnecting';
    default:
      return 'unknown';
  }
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getConnectionOptions = () => ({
  maxPoolSize: Number(process.env.MONGO_POOL_MAX || 20),
  minPoolSize: Number(process.env.MONGO_POOL_MIN || 2),
  serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000),
  socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 45000),
  connectTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 10000),
  heartbeatFrequencyMS: Number(process.env.MONGO_HEARTBEAT_FREQUENCY_MS || 30000),
  retryWrites: true
});

const discardConnection = async (farmId, connection) => {
  connections.delete(farmId);
  accessOrder.delete(farmId);

  if (connection && typeof connection.close === 'function') {
    try {
      await connection.close();
      logger.info('Discarded stale farm connection', { farmId });
    } catch (closeError) {
      logger.warn('Unable to close stale farm connection', {
        farmId,
        error: closeError?.message
      });
    }
  }
};

const buildFarmUri = (mongoUri, farmId) => {
  try {
    if (!mongoUri || typeof mongoUri !== 'string' || !mongoUri.trim()) {
      throw new InvalidMongoUriError('buildFarmUri() requires a non-empty MONGO_URI string.');
    }

    const normalizedFarmId = validateFarmId(farmId);
    const parsed = parseMongoUri(mongoUri);
    const cacheKey = `${mongoUri}::${normalizedFarmId}`;
    const cached = farmUriCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const authSegment = parsed.auth ? `${parsed.auth}@` : '';
    const querySegment = parsed.query ? `?${parsed.query}` : '';
    const farmUri = `${parsed.prefix}${authSegment}${parsed.hosts}/${normalizedFarmId}${querySegment}`;

    logger.info('buildFarmUri() URI replacement', {
      originalMaskedUri: maskMongoUri(mongoUri),
      replacementMaskedUri: maskMongoUri(farmUri),
      farmId: normalizedFarmId
    });

    farmUriCache.set(cacheKey, farmUri);
    return farmUri;
  } catch (error) {
    logger.error('buildFarmUri() failed', {
      error: error?.message,
      farmId: farmId,
      originalMaskedUri: maskMongoUri(mongoUri)
    });
    throw error instanceof MongoManagerError
      ? error
      : new InvalidMongoUriError('buildFarmUri() could not rewrite the MongoDB URI for the requested farm.', error);
  }
};

const resolveSrvMongoUri = async (mongoUri) => {
  const parsed = parseMongoUri(mongoUri);
  if (parsed.prefix !== 'mongodb+srv://') {
    return mongoUri;
  }

  const hostCandidate = parsed.hosts.split(',')[0];
  if (!hostCandidate || !hostCandidate.trim()) {
    throw new InvalidMongoUriError('MongoDB SRV URI must include a valid host entry.');
  }

  try {
    const resolver = new dns.promises.Resolver();
    resolver.setServers(['1.1.1.1', '8.8.8.8']);
    const hostOnly = hostCandidate.split(':')[0];

    const srvRecords = await resolver.resolveSrv(`_mongodb._tcp.${hostOnly}`);
    if (!srvRecords || srvRecords.length === 0) {
      throw new InvalidMongoUriError('SRV lookup returned no MongoDB hosts.');
    }

    const resolvedHosts = srvRecords.map((record) => `${record.name}:${record.port}`).join(',');
    const authSegment = parsed.auth ? `${parsed.auth}@` : '';
    const querySegment = parsed.query ? `?${parsed.query}` : '';
    return `mongodb://${authSegment}${resolvedHosts}/${parsed.database}${querySegment}`;
  } catch (error) {
    logger.warn('SRV resolution failed, returning original MongoDB URI', {
      error: error?.message,
      maskedUri: maskMongoUri(mongoUri)
    });
    return mongoUri;
  }
};

const createFarmConnection = async (farmId) => {
  const normalizedFarmId = validateFarmId(farmId);
  const rawMongoUri = process.env.MONGO_URI;
  if (!rawMongoUri) {
    throw new InvalidMongoUriError('MONGO_URI environment variable is required.');
  }

  const effectiveMongoUri = await resolveSrvMongoUri(rawMongoUri);
  const farmUri = buildFarmUri(effectiveMongoUri, normalizedFarmId);
  const maskedUri = maskMongoUri(farmUri);
  const connectOptions = getConnectionOptions();

  logger.info('Creating farm database connection', {
    farmId: normalizedFarmId,
    maskedUri,
    connectionOptions: {
      maxPoolSize: connectOptions.maxPoolSize,
      minPoolSize: connectOptions.minPoolSize,
      connectTimeoutMS: connectOptions.connectTimeoutMS,
      serverSelectionTimeoutMS: connectOptions.serverSelectionTimeoutMS
    }
  });

  let connection = null;
  let lastError = null;
  const startTime = Date.now();

  for (let attempt = 1; attempt <= CONNECT_RETRY_MAX; attempt += 1) {
    connection = mongoose.createConnection(farmUri, connectOptions);

    try {
      await connection.asPromise();
      const durationMs = Date.now() - startTime;
      logger.info('Farm database connection established', {
        farmId: normalizedFarmId,
        maskedUri,
        connectionState: getConnectionStateLabel(connection.readyState),
        connectDurationMs: durationMs,
        attempt
      });
      break;
    } catch (error) {
      lastError = error;
      const isFinalAttempt = attempt >= CONNECT_RETRY_MAX;
      const retryDelayMs = CONNECT_RETRY_BASE_MS * Math.pow(2, attempt - 1);
      logger.warn('Farm database connection attempt failed', {
        farmId: normalizedFarmId,
        maskedUri,
        attempt,
        connectionState: getConnectionStateLabel(connection.readyState),
        error: error?.message,
        nextRetryInMs: isFinalAttempt ? null : retryDelayMs
      });

      await discardConnection(normalizedFarmId, connection);

      if (isFinalAttempt) {
        if (/timeout|timed out|ETIMEDOUT/i.test(error?.message || '')) {
          throw new ConnectionTimeoutError('Timed out connecting to farm database.', error);
        }
        throw new DatabaseConnectionError('Failed to connect to farm database after retries.', error);
      }

      await wait(retryDelayMs);
    }
  }

  if (!connection || connection.readyState !== 1) {
    throw new DatabaseConnectionError('Failed to establish farm database connection.', lastError);
  }

  connection.on('connected', () => {
    logger.info('Farm database connection event: connected', {
      farmId: normalizedFarmId,
      connectionState: getConnectionStateLabel(connection.readyState)
    });
  });

  connection.on('error', (error) => {
    logger.error('Farm database connection event: error', {
      farmId: normalizedFarmId,
      error: error?.message,
      connectionState: getConnectionStateLabel(connection.readyState)
    });
  });

  connection.on('disconnected', async () => {
    logger.warn('Farm database connection event: disconnected', {
      farmId: normalizedFarmId,
      connectionState: getConnectionStateLabel(connection.readyState)
    });
    await discardConnection(normalizedFarmId, connection);
  });

  connection.on('reconnected', () => {
    logger.info('Farm database connection event: reconnected', {
      farmId: normalizedFarmId,
      connectionState: getConnectionStateLabel(connection.readyState)
    });
    connections.set(normalizedFarmId, connection);
    touchConnection(normalizedFarmId);
  });

  connections.set(normalizedFarmId, connection);
  touchConnection(normalizedFarmId);
  await evictStaleConnectionIfNeeded();
  return connection;
};

const getFarmConnection = async (farmId) => {
  const normalizedFarmId = validateFarmId(farmId);
  const cachedConnection = connections.get(normalizedFarmId);

  if (cachedConnection) {
    if (cachedConnection.readyState === 1) {
      touchConnection(normalizedFarmId);
      logger.info('Reusing cached farm database connection', {
        farmId: normalizedFarmId,
        connectionState: getConnectionStateLabel(cachedConnection.readyState)
      });
      return cachedConnection;
    }

    logger.warn('Stale cached farm connection detected, refreshing', {
      farmId: normalizedFarmId,
      connectionState: getConnectionStateLabel(cachedConnection.readyState)
    });
    await discardConnection(normalizedFarmId, cachedConnection);
  }

  if (pendingConnections.has(normalizedFarmId)) {
    logger.info('Awaiting existing farm connection promise', { farmId: normalizedFarmId });
    return pendingConnections.get(normalizedFarmId);
  }

  const connectionPromise = createFarmConnection(normalizedFarmId);
  pendingConnections.set(normalizedFarmId, connectionPromise);

  try {
    return await connectionPromise;
  } finally {
    pendingConnections.delete(normalizedFarmId);
  }
};

const closeFarmConnection = async (farmId) => {
  const normalizedFarmId = normalizeFarmId(farmId);
  if (!normalizedFarmId) {
    return;
  }

  const connection = connections.get(normalizedFarmId);
  if (!connection) {
    return;
  }

  try {
    await connection.close();
    logger.info('Farm database connection closed', { farmId: normalizedFarmId });
  } catch (error) {
    logger.warn('Error closing farm database connection', {
      farmId: normalizedFarmId,
      error: error?.message
    });
  }

  connections.delete(normalizedFarmId);
  accessOrder.delete(normalizedFarmId);
};

const getActiveConnections = () => Array.from(connections.keys());

const closeAllConnections = async () => {
  const closures = Array.from(connections.entries()).map(async ([farmId, connection]) => {
    try {
      await connection.close();
      logger.info('Closed farm database connection', { farmId });
    } catch (error) {
      logger.warn('Failed to close farm database connection', {
        farmId,
        error: error?.message
      });
    }
  });

  await Promise.all(closures);
  connections.clear();
  accessOrder.clear();
  pendingConnections.clear();
  logger.info('All farm database connections closed');
};

module.exports = {
  getFarmConnection,
  closeFarmConnection,
  getActiveConnections,
  closeAllConnections,
  resolveSrvMongoUri,
  buildFarmUri
};