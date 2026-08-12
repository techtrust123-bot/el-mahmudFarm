// This variable contain one day calculation in milliseconds
const MS_PER_DAY = 1000 * 60 * 60 * 24;

// This function makes sure that the date is valid and returns a Date object. If the input is invalid or not provided, it defaults to the current date.
const normalizeDate = (value) => {
  if (!value) return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

// This function calculates the number of days a poultry batch or livestock has been on the farm based on its join date or purchase date. It normalizes the input date and compares it to the current date, returning at least 1 day to avoid zero or negative values.
const getDaysOnFarm = (purchaseDate) => {
  // This variable contains the normalized purchase date of the poultry batch or livestock. It ensures that the date is valid and defaults to the current date if not provided or invalid.
  const start = normalizeDate(purchaseDate);

  // This variable contains the current date. It is used to calculate the difference in days between the purchase date and today.
  const today = new Date();

  // This variables removes hours, minutes, seconds, and milliseconds from both the current date and the purchase date to ensure that the calculation is based solely on full days. This prevents partial days from affecting the result.
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfJoin = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  // This variable calculates the difference in days between the current date and the purchase date by subtracting the two normalized dates and dividing by the number of milliseconds in a day. It uses Math.floor to round down to the nearest whole number, ensuring that only full days are counted. The result is then compared to 1 using Math.max to ensure that at least 1 day is returned, preventing zero or negative values.
  const days = Math.floor((startOfToday - startOfJoin) / MS_PER_DAY);
  // This function returns the maximum of the calculated days and 1, ensuring that the result is always at least 1 day. This is important for scenarios where a poultry batch or livestock has just joined the farm, as it prevents calculations from resulting in zero or negative values, which could lead to errors in feed consumption calculations or other related metrics.
  return Math.max(days, 1);
};
// This function calculates the feed consumption and associated costs for a poultry batch based on the provided feed data and the poultry batch's details. It takes into account the number of days the poultry has been on the farm, the quantity of poultry, daily feed consumption rates, and feed prices to compute total feed consumed, cost per poultry, and overall costs.
const calculateBatchConsumption = (feed, poultryBatch) => {
  const daysOnFarm = getDaysOnFarm(poultryBatch.joinDate || poultryBatch.purchaseDate);
  const quantity = Math.max(Number(poultryBatch.quantity) || 1, 1);
  let poultryDailyConsumption = Number(feed.poultryDailyConsumption) || 0;
  const feedPricePerkg = Number(feed.feedPricePerkg) || 0;
  // I will change the variable name to AveragePoultryFeedConsumptionPerDay to make it more descriptive and clear that it represents the Average  feed will  be consumed by the poultry batch per day. This change will help avoid confusion with other variables and improve code readability.
  const totalPoultryFeedConsumedPerday = Number(feed.totalPoultryFeedConsumedPerday || 0);
  // This if statement checks if the poultryDailyConsumption is less than or equal to 0, and if the totalPoultryFeedConsumedPerday is greater than 0, and if the quantity of poultry in the batch is greater than 0. If all these conditions are met, it calculates the poultryDailyConsumption by dividing the totalPoultryFeedConsumedPerday by the quantity of poultry in the batch. This ensures that if no specific daily consumption rate is provided, but there is data on total feed consumed per day, the daily consumption can be inferred from that data.
  if (poultryDailyConsumption <= 0 && totalPoultryFeedConsumedPerday > 0 && Number(poultryBatch.quantity) > 0) {
    poultryDailyConsumption = totalPoultryFeedConsumedPerday / Number(poultryBatch.quantity)
  }
  // This variable store how many each poultry consumed based on the days it stay on the farm
  const feedConsumedPerBird = poultryDailyConsumption * daysOnFarm;

  // This variable calculate total feed consumed by all the poultry in that poultryBatch.
  const totalFeedConsumed = feedConsumedPerBird * quantity;

  // This calculate the price of feed that each poultry consumed
  const feedCostPerPoultry = feedConsumedPerBird * feedPricePerkg;

  // This calculate the price or cost of feed consumed in that poultryBatch.
  const totalFeedCost = feedCostPerPoultry * quantity;

  // This calculate the cost of that poultryBatch 
  const totalCost = Number(poultryBatch.purchasePrice || 0) + totalFeedCost;

  // This calculate cost of each poultry in the poultryBatch
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
  if (poultryDailyConsumption <= 0 && totalPoultryFeedConsumedPerday > 0) {
    poultryDailyConsumption = totalPoultryFeedConsumedPerday / quantity
  }

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
