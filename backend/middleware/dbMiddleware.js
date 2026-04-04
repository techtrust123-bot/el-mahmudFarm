const { getFarmConnection } = require('../utils/dbManager');
const { getModels } = require('../utils/modelFactory');

/**
 * Middleware to attach farm database models to req.farmModels
 * Must run AFTER authMiddleware
 */
const attachFarmDB = async (req, res, next) => {
  try {
    // Check if user is authenticated and has farmId
    if (!req.user || !req.user.farmId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required or farm access denied'
      });
    }

    const farmId = req.user.farmId;

    // Get farm database connection
    const connection = await getFarmConnection(farmId);

    // Get models bound to this connection
    const farmModels = getModels(connection);

    // Attach to request
    req.farmModels = farmModels;

    next();
  } catch (error) {
    console.error('Database connection error:', error);
    return res.status(500).json({
      success: false,
      message: 'Database connection error'
    });
  }
};

module.exports = { attachFarmDB };