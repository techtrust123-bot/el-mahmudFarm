const cron = require('node-cron');
const authModel = require('../models/auth');
const logger = require('../utils/logger');
const { getFarmConnection } = require('../utils/dbManager');
const { getModels } = require('../utils/modelFactory');
const { recalculatePoultry, recalculateLivestock } = require('../controllers/feedController');

const FEED_RECALCULATION_CRON = process.env.FEED_RECALCULATION_CRON || '0 0 * * *';

let isFeedRecalculationRunning = false;

const scheduledJob = cron.schedule(
  FEED_RECALCULATION_CRON,
  async () => {
    await runNow();
  },
  { scheduled: false }
);

const normalizeFarmId = (farmId) => {
  if (typeof farmId !== 'string') {
    return null;
  }

  const normalized = farmId.trim();
  return normalized || null;
};

const buildJobStats = () => ({
  success: true,
  farmsProcessed: 0,
  feedsProcessed: 0,
  failures: 0,
  durationMs: 0
});

const recalculateFeedsForFarm = async (farmId) => {
  const normalizedFarmId = normalizeFarmId(farmId);

  if (!normalizedFarmId) {
    logger.warn('Feed recalculation skipped: invalid farmId supplied', { farmId });
    return {
      success: false,
      feedsProcessed: 0,
      failures: 1
    };
  }

  let connection;
  try {
    connection = await getFarmConnection(normalizedFarmId);
  } catch (connectionError) {
    logger.error('Feed recalculation skipped: unable to connect to tenant database', {
      farmId: normalizedFarmId,
      error: connectionError?.message || 'unknown'
    });
    return {
      success: false,
      feedsProcessed: 0,
      failures: 1
    };
  }

  if (!connection || connection.readyState !== 1) {
    logger.warn('Feed recalculation skipped: tenant database connection not ready', {
      farmId: normalizedFarmId,
      connectionState: connection?.readyState || 'unknown'
    });
    return {
      success: false,
      feedsProcessed: 0,
      failures: 1
    };
  }

  let models;
  try {
    models = getModels(connection);
  } catch (modelError) {
    logger.error('Feed recalculation skipped: failed to initialize tenant models', {
      farmId: normalizedFarmId,
      error: modelError?.message || 'unknown'
    });
    return {
      success: false,
      feedsProcessed: 0,
      failures: 1
    };
  }

  let feeds = [];
  try {
    feeds = await models.Feed.find();
  } catch (feedQueryError) {
    logger.error('Feed recalculation skipped: failed to query feeds for tenant', {
      farmId: normalizedFarmId,
      error: feedQueryError?.message || 'unknown'
    });
    return {
      success: false,
      feedsProcessed: 0,
      failures: 1
    };
  }

  if (!feeds || feeds.length === 0) {
    logger.info('Feed recalculation finished for farm with no feeds', {
      farmId: normalizedFarmId,
      feedsProcessed: 0
    });
    return {
      success: true,
      feedsProcessed: 0,
      failures: 0
    };
  }

  let feedsProcessed = 0;
  let failures = 0;

  for (const feed of feeds) {
    try {
      await recalculatePoultry(feed, models);
      await recalculateLivestock(feed, models);
      feedsProcessed += 1;
    } catch (feedError) {
      failures += 1;
      logger.error('Feed recalculation failed for a feed document', {
        farmId: normalizedFarmId,
        feedId: feed?._id || null,
        error: feedError?.message || 'unknown'
      });
    }
  }

  logger.info('Feed recalculation completed for farm', {
    farmId: normalizedFarmId,
    feedsProcessed,
    failures
  });

  return {
    success: failures === 0,
    feedsProcessed,
    failures
  };
};

const recalculateAllFeeds = async () => {
  if (isFeedRecalculationRunning) {
    logger.warn('Feed recalculation already running. Skipping...');
    return {
      ...buildJobStats(),
      success: false,
      skipped: true,
      message: 'Feed recalculation already running. Skipping...'
    };
  }

  isFeedRecalculationRunning = true;
  const jobStartTime = process.hrtime.bigint();
  const startTimestamp = new Date().toISOString();
  const stats = buildJobStats();

  logger.info('Feed recalculation job started', {
    startTimestamp,
    cron: FEED_RECALCULATION_CRON
  });

  try {
    const managers = await authModel.find({
      userType: 'manager',
      farmId: { $exists: true, $ne: null }
    });

    if (!managers || managers.length === 0) {
      logger.info('Feed recalculation job completed with no managers to process', {
        startTimestamp,
        finishTimestamp: new Date().toISOString(),
        farmsProcessed: 0,
        feedsProcessed: 0,
        failures: 0,
        durationMs: 0
      });
      return {
        ...stats,
        success: true,
        farmsProcessed: 0,
        feedsProcessed: 0,
        failures: 0,
        durationMs: 0
      };
    }

    for (const manager of managers) {
      if (!manager.farmId) {
        continue;
      }

      try {
        const farmStats = await recalculateFeedsForFarm(manager.farmId);
        stats.farmsProcessed += 1;
        stats.feedsProcessed += farmStats.feedsProcessed || 0;
        stats.failures += farmStats.failures || 0;
      } catch (farmError) {
        stats.failures += 1;
        logger.error('Feed recalculation failed for farm', {
          farmId: manager.farmId,
          error: farmError?.message || 'unknown'
        });
      }
    }

    const finishTimestamp = new Date().toISOString();
    const durationMs = Number(process.hrtime.bigint() - jobStartTime) / 1e6;
    stats.durationMs = Math.round(durationMs);

    logger.info('Feed recalculation job completed', {
      startTimestamp,
      finishTimestamp,
      farmsProcessed: stats.farmsProcessed,
      feedsProcessed: stats.feedsProcessed,
      failures: stats.failures,
      durationMs: stats.durationMs
    });

    return stats;
  } catch (error) {
    stats.success = false;
    stats.failures += 1;

    const finishTimestamp = new Date().toISOString();
    const durationMs = Number(process.hrtime.bigint() - jobStartTime) / 1e6;
    stats.durationMs = Math.round(durationMs);

    logger.error('Feed recalculation job failed unexpectedly', {
      startTimestamp,
      finishTimestamp,
      farmsProcessed: stats.farmsProcessed,
      feedsProcessed: stats.feedsProcessed,
      failures: stats.failures,
      durationMs: stats.durationMs,
      error: error?.message || 'unknown'
    });

    return stats;
  } finally {
    isFeedRecalculationRunning = false;
  }
};

const startFeedRecalculationJob = () => {
  if (scheduledJob && typeof scheduledJob.start === 'function') {
    if (scheduledJob.isRunning?.()) {
      logger.info('Feed recalculation scheduler already running', {
        cron: FEED_RECALCULATION_CRON
      });
      return scheduledJob;
    }

    scheduledJob.start();
    logger.info('Feed recalculation scheduler started', {
      cron: FEED_RECALCULATION_CRON
    });
  }

  return scheduledJob;
};

const stopFeedRecalculationJob = () => {
  if (!scheduledJob || typeof scheduledJob.stop !== 'function') {
    return;
  }

  try {
    scheduledJob.stop();
    logger.info('Feed recalculation scheduler stopped');
  } catch (stopError) {
    logger.error('Failed to stop feed recalculation scheduler', {
      error: stopError?.message || 'unknown'
    });
  }
};

const runNow = async () => {
  logger.info('Manual feed recalculation requested via runNow()');
  return recalculateAllFeeds();
};

module.exports = {
  startFeedRecalculationJob,
  stopFeedRecalculationJob,
  recalculateAllFeeds,
  runNow,
  scheduledJob
};
