const mongoose = require('mongoose');
const winston = require('winston');
const dns = require('dns');
const { URL } = require('url');

async function resolveSrvMongoUri(uri) {
  if (!uri || !uri.startsWith('mongodb+srv://')) {
    return uri;
  }

  dns.setServers(['1.1.1.1', '8.8.8.8']);

  const parsed = new URL(uri);
  const host = parsed.hostname;
  const dbName = parsed.pathname.startsWith('/') ? parsed.pathname.slice(1) : parsed.pathname;
  const auth = parsed.username
    ? `${encodeURIComponent(parsed.username)}:${encodeURIComponent(parsed.password)}@`
    : '';

  try {
    const srvRecords = await dns.promises.resolveSrv(`_mongodb._tcp.${host}`);
    const hosts = srvRecords.map((record) => `${record.name}:${record.port}`).join(',');
    return `mongodb://${auth}${hosts}/${dbName}${parsed.search}`;
  } catch (error) {
    // If SRV resolution fails, return the original SRV URI
    console.warn(`SRV resolution failed for ${host}, using original SRV URI:`, error.message);
    return uri;
  }
}

function buildFarmUri(mongoUri, farmId) {
  const dbName = `farm_${farmId}`;
  return mongoUri.replace(/\/([^/?]+)(\?|$)/, `/${dbName}$2`);
}

// Logger instance
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

module.exports = {
  resolveSrvMongoUri,
  buildFarmUri,
  logger
};

// Cache for active farm connections
const connections = new Map();

const pendingConnections = new Map()

function buildFarmUri(mongoUri, farmId) {
    const dbName = `farm_${farmId}`

    //  Replace only the database name part, preserve all query params
    const farmUri = mongoUri.replace(/\/([^/?]+)(\?|$)/, `/${dbName}$2`)

    //  Safety check — make sure replacement worked
    if (farmUri === mongoUri) {
        // Fallback: append database name manually
        const baseUri = mongoUri.substring(0, mongoUri.lastIndexOf('/'))
        const params = mongoUri.includes('?') ? mongoUri.substring(mongoUri.indexOf('?')) : ''
        return `${baseUri}/${dbName}${params}`
    }

    return farmUri
}
/**
 * Get the base MongoDB URI without the database name
//  * @param {string} mongoUri - Full MongoDB URI
//  * @returns {string} Base URI
 */
// function getBaseUri(mongoUri) {
//   return mongoUri.substring(0, mongoUri.lastIndexOf('/'));
// }

/**
 * Get or create a connection to a farm's database
//  * @param {string} farmId - The farm ID
//  * @returns {Promise<mongoose.Connection>} Farm database connection
 */
const getFarmConnection = async (farmId) => {
  // Return already connected farm connection
  if (connections.has(farmId)) {
    const connection = connections.get(farmId);
    if (connection.readyState === 1) {
      return connection;
    }

    try {
      await connection.close();
    } catch (_) {}
    connections.delete(farmId);
  }

  if (pendingConnections.has(farmId)) {
    return pendingConnections.get(farmId);
  }

  const connectionPromise = createFarmConnection(farmId);
  pendingConnections.set(farmId, connectionPromise);

  try {
    const connection = await connectionPromise;
    pendingConnections.delete(farmId);
    return connection;
  } catch (error) {
    pendingConnections.delete(farmId);
    throw error;
  }
};

const createFarmConnection = async (farmId) => {
    const mongoUri = process.env.MONGO_URI
    if (!mongoUri) throw new Error('MONGO_URI environment variable is not set')

    const farmUri = buildFarmUri(mongoUri, farmId)
    logger.info(`Connecting to farm database: farm_${farmId}`)

    const connection = mongoose.createConnection(farmUri, {
        maxPoolSize: 10,                   // ✅ increased pool size
        minPoolSize: 2,                    // ✅ keep minimum connections alive
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        heartbeatFrequencyMS: 30000,       // ✅ check connection health every 30s
        retryWrites: true,
    })

    try {
        await connection.asPromise()
    } catch (error) {
        try { await connection.close() } catch (_) {}
        throw new Error(`Failed to connect to farm_${farmId}: ${error.message}`)
    }

    // ✅ Set up listeners after connection confirmed
    connection.on('error', (err) => {
        logger.error(`Farm database error for farm_${farmId}: ${err.message}`)
        connections.delete(farmId)
    })

    connection.on('disconnected', () => {
        logger.info(`Farm database disconnected: farm_${farmId}`)
        connections.delete(farmId)
    })

    connection.on('reconnected', () => {
        logger.info(`Farm database reconnected: farm_${farmId}`)
        connections.set(farmId, connection)  // ✅ restore to cache on reconnect
    })

    logger.info(`Farm database connected: farm_${farmId}`)
    connections.set(farmId, connection)
    return connection
}

const closeFarmConnection = async (farmId) => {
  if (connections.has(farmId)) {
    const connection = connections.get(farmId);
    await connection.close();
    connections.delete(farmId);
    logger.info(`Farm database connection closed: farm_${farmId}`);
  }
};

const getActiveConnections = () => {
  return Array.from(connections.keys());
};

/**
 * Close all farm connections (for graceful shutdown)
 */
// const closeAllConnections = async () => {
//   const promises = [];
//   for (const [farmId, connection] of connections) {
//     promises.push(
//       connection.close().then(() => {
//         logger.info(`Closed farm database connection: farm_${farmId}`);
//       }).catch(err => {
//         logger.error(`Error closing farm database connection for farm_${farmId}:`, err);
//       })
//     );
//   }
//   await Promise.all(promises);
//   connections.clear();
// };

const closeAllConnections = async () => {
    const promises = Array.from(connections.entries()).map(([farmId, connection]) =>
        connection.close()
            .then(() => logger.info(`Closed farm database: farm_${farmId}`))
            .catch(err => logger.error(`Error closing farm_${farmId}: ${err.message}`))
    )
    await Promise.all(promises)
    connections.clear()
    logger.info('All farm database connections closed')
}

module.exports = {
  getFarmConnection,
  closeFarmConnection,
  getActiveConnections,
  closeAllConnections,
  buildFarmUri,
  resolveSrvMongoUri,
};