const cron = require('node-cron');
const Feed = require('../models/feed');
const { recalculatePoultry, recalculateLivestock } = require('../controllers/feedController');

const recalculateAllFeeds = async () => {
  try {
    const feeds = await Feed.find();
    if (!feeds || feeds.length === 0) return;

    for (const feed of feeds) {
      await recalculatePoultry(feed);
      await recalculateLivestock(feed);
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
