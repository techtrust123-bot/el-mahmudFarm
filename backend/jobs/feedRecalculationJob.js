const cron = require('node-cron');
const authModel = require('../models/auth');
const { getFarmConnection } = require('../utils/dbManager');
const { getModels } = require('../utils/modelFactory');
const { recalculatePoultry, recalculateLivestock } = require('../controllers/feedController');

const recalculateFeedsForFarm = async (farmId) => {
  const connection = await getFarmConnection(farmId);
  const models = getModels(connection);
  const feeds = await models.Feed.find();
  if (!feeds || feeds.length === 0) return;

  for (const feed of feeds) {
    await recalculatePoultry(feed, models);
    await recalculateLivestock(feed, models);
  }
};

const recalculateAllFeeds = async () => {
  try {
    const managers = await authModel.find({ userType: 'manager', farmId: { $exists: true, $ne: null } });
    if (!managers || managers.length === 0) return;

    for (const manager of managers) {
      if (!manager.farmId) continue;
      await recalculateFeedsForFarm(manager.farmId);
    }

    console.log('Daily feed recalculation complete.');
  } catch (error) {
    console.error('Daily feed recalculation error:', error);
  }
};

cron.schedule('0 0 * * *', async () => {
  console.log('Running daily feed recalculation job.');
  await recalculateAllFeeds();
});

module.exports = {
  recalculateAllFeeds,
};
