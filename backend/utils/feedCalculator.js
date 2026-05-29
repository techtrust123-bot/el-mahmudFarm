const MS_PER_DAY = 1000 * 60 * 60 * 24;

const normalizeDate = (value) => {
  if (!value) return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const getDaysOnFarm = (joinDate) => {
  const start = normalizeDate(joinDate);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfJoin = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const days = Math.floor((startOfToday - startOfJoin) / MS_PER_DAY);
  return Math.max(days, 1);
};

const calculateBatchConsumption = (feed, poultryBatch) => {
  const daysOnFarm = getDaysOnFarm(poultryBatch.joinDate || poultryBatch.purchaseDate);
  const quantity = Math.max(Number(poultryBatch.quantity) || 1, 1);
  let poultryDailyConsumption = Number(feed.poultryDailyConsumption) || 0;
  const feedPricePerkg = Number(feed.feedPricePerkg) || 0;
  const totalPoultryFeedConsumedPerday = Number(feed.totalPoultryFeedConsumedPerday || 0);
  poultryDailyConsumption = totalPoultryFeedConsumedPerday / Number(poultryBatch.quantity)

  // averageDailyConsumption is expected per bird per day
  const poultryInputs = Number(poultryDailyConsumption || 0)
  // let poultryDailyConsumption = 0
  const feedConsumedPerBird = poultryDailyConsumption * daysOnFarm;
  const totalFeedConsumed = feedConsumedPerBird * quantity;

  const feedCostPerPoultry = feedConsumedPerBird * feedPricePerkg;
  const totalFeedCost = feedCostPerPoultry * quantity;

  const totalCost = Number(poultryBatch.purchasePrice || 0) + totalFeedCost;
  const costPerPoultry = totalCost / quantity;

  return {
    daysOnFarm,
    totalFeedConsumed,
    poultryConsumePerBird: feedConsumedPerBird,
    feedCostPerPoultry,
    totalFeedCost,
    totalCost,
    costPerPoultry,
    poultryDailyConsumption,
  };
};

const calculateLivestockConsumption = (feed = {}, livestock) => {
  const daysOnFarm = getDaysOnFarm(livestock.joinDate || livestock.purchaseDate);
  const quantity = Math.max(Number(livestock.quantity) || 1, 1);
  const livestockDailyConsumptionFromFeed = Number(feed.livestockDailyConsumption) || 0;
  const feedPricePerkg = Number(feed.feedPricePerkg) || 0;
  const totalLivestockFeedPerday = Number(feed.totalLivestockFeedConsumedPerday) || 0;

  let livestockDailyConsumption = livestockDailyConsumptionFromFeed;
  if (livestockDailyConsumption <= 0 && totalLivestockFeedPerday > 0) {
    livestockDailyConsumption = totalLivestockFeedPerday / quantity;
  }

  const feedConsumedPerAnimal = livestockDailyConsumption * daysOnFarm;
  const totalFeedConsumed = feedConsumedPerAnimal * quantity;

  const costPrice = feedConsumedPerAnimal * feedPricePerkg;
  const totalCost = Number(livestock.purchasePrice || 0) + costPrice;

  return {
    daysOnFarm,
    totalFeedConsumed,
    livestockFeedConsumedPerAnimal: feedConsumedPerAnimal,
    costPrice,
    totalCost,
  };
};

const calculateFeedForPoultry = (feed, poultry) => {
  const quantity = Math.max(Number(poultry.quantity) || 1, 1);
  let poultryDailyConsumption = Number(feed.poultryDailyConsumption) || 0;
  const totalPoultryFeedConsumedPerday = Number(feed.totalPoultryFeedConsumedPerday || 0);
  poultryDailyConsumption = totalPoultryFeedConsumedPerday / Number(poultry.quantity)

  return {
    poultryDailyConsumption,
    quantity,
  };
}

module.exports = {
  calculateBatchConsumption,
  calculateLivestockConsumption,
  calculateFeedForPoultry,
};
