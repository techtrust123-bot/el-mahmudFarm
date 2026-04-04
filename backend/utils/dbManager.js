const mongoose = require('mongoose');
const winston = require('winston');

// Logger instance
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// Cache for active farm connections
const connections = new Map();

/**
 * Get the base MongoDB URI without the database name
 * @param {string} mongoUri - Full MongoDB URI
 * @returns {string} Base URI
 */
function getBaseUri(mongoUri) {
  return mongoUri.substring(0, mongoUri.lastIndexOf('/'));
}

/**
 * Get or create a connection to a farm's database
 * @param {string} farmId - The farm ID
 * @returns {Promise<mongoose.Connection>} Farm database connection
 */
const getFarmConnection = async (farmId) => {
  // Check if connection already exists and is ready
  if (connections.has(farmId)) {
    const connection = connections.get(farmId);
    if (connection.readyState === 1) {
      return connection;
    }
    // Connection exists but not ready, remove it
    connections.delete(farmId);
    await connection.close();
  }

  // Create new connection
  const baseUri = getBaseUri(process.env.MONGO_URI);
  const farmUri = `${baseUri}/farm_${farmId}`;

  const connection = mongoose.createConnection(farmUri, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  // Set up event listeners
  connection.on('connected', () => {
    logger.info(`Farm database connected: farm_${farmId}`);
  });

  connection.on('error', (err) => {
    logger.error(`Farm database connection error for farm_${farmId}:`, err);
  });

  connection.on('disconnected', () => {
    logger.info(`Farm database disconnected: farm_${farmId}`);
    connections.delete(farmId);
  });

  // Wait for connection to be ready
  await new Promise((resolve, reject) => {
    connection.once('connected', resolve);
    connection.once('error', reject);
  });

  // Cache the connection
  connections.set(farmId, connection);

  return connection;
};

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
const closeAllConnections = async () => {
  const promises = [];
  for (const [farmId, connection] of connections) {
    promises.push(
      connection.close().then(() => {
        logger.info(`Closed farm database connection: farm_${farmId}`);
      }).catch(err => {
        logger.error(`Error closing farm database connection for farm_${farmId}:`, err);
      })
    );
  }
  await Promise.all(promises);
  connections.clear();
};

module.exports = {
  getFarmConnection,
  closeFarmConnection,
  getActiveConnections,
  closeAllConnections,
  getBaseUri
};