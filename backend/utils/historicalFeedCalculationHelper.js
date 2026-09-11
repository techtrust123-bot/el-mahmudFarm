const {
    getPoultryFeedStagePeriods,
    getLivestockFeedStagePeriods,
    getFeedForStage,
} = require('./feedStageHelper.js')
const ApiError = require('./ApiError')
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const calculateHistoricalPoultryFeed = async ({
    Feed,
    animalType,
    purchaseDate,
    purchasePrice,
    quantity,
}) => {
    const safeQuantity = Math.max(Number(quantity) || 0, 0)

    if (!Feed || !animalType || !purchaseDate || safeQuantity <= 0) {
        return {
            totalFeedConsumed: 0,
            poultryConsumePerBird: 0,
            feedCostPerPoultry: 0,
            totalFeedCost: 0,
            feedHistory: [],
        }
    }

    const purchase = new Date(purchaseDate)
    const today = new Date()
    const purchasePriceNum = Number(purchasePrice) || 0

    if (purchasePriceNum < 0) {
        throw new Error('Invalid poultry purchasePrice.')
    }

    if (Number.isNaN(purchase.getTime())) {
        throw new Error('Invalid poultry purchaseDate.')
    }

    if (purchase > today) {
        throw new Error('Poultry purchaseDate cannot be in the future.')
    }

    // Calculate how many days the poultry has been in the farm.
    const elapsedDays = Math.max(
        Math.floor((today - purchase) / MS_PER_DAY),
        0
    )


   const stagePeriods = getPoultryFeedStagePeriods(
    0,
    elapsedDays
    )

    if (stagePeriods.length === 0) {
        return {
            totalFeedConsumed: 0,
            poultryConsumePerBird: 0,
            feedCostPerPoultry: 0,
            totalFeedCost: 0,
            feedHistory: [],
        }
    }

    let totalFeedConsumedPerBird = 0
    let totalFeedCostPerBird = 0

    const feedHistory = []


    for (const period of stagePeriods) {
    const feedStage = period.stage

    const feed = await getFeedForStage(
        Feed,
        animalType,
        feedStage
    )

    if (!feed) {
        throw new ApiError(
            404,
            `No ${animalType} ${feedStage} feed is configured for this farm.`,
            {
                animalType,
                feedStage,
                purchaseDate,
            }
        )
    }

    const totalDailyFeed = Math.max(
        Number(feed.totalPoultryFeedConsumedPerday) || 0,
        0
    )

    const dailyFeedPerBird =
            safeQuantity > 0
                ? totalDailyFeed / safeQuantity
                : 0


    const pricePerKg = Math.max(
        Number(feed.feedPricePerkg) || 0,
        0
    )

    const stagePurchasePricePerBird = 
    purchasePriceNum / safeQuantity;

    const stageFeedConsumedPerBird =
        dailyFeedPerBird * period.days

    const stageFeedCostPerBird =
        stageFeedConsumedPerBird * pricePerKg

    const stageTotalFeedCost =
        stageFeedCostPerBird * safeQuantity

    totalFeedConsumedPerBird +=
        stageFeedConsumedPerBird

    totalFeedCostPerBird +=
        stageFeedCostPerBird

    feedHistory.push({
        feedStage,
        feedName: feed.feedName,
        feedType: feed.feedType,
        feedCategory: feed.feedCategory,

        poultryConsumePerBird:
            stageFeedConsumedPerBird,

        feedCostPerPoultry:
            stageFeedCostPerBird,

        totalFeedCost:
            stageTotalFeedCost,

        costPerPoultry:
            totalFeedCostPerBird + stagePurchasePricePerBird,

        startAgeInDays:
            period.startAgeInDays,

        endAgeInDays:
            period.endAgeInDays,

        days:
            period.days,

        recordedAt: today,
    })
}

    const totalFeedConsumed =
        totalFeedConsumedPerBird * safeQuantity

        const totalFeedCost =
            totalFeedCostPerBird * safeQuantity

    return {
        totalFeedConsumed,

        poultryConsumePerBird:
            totalFeedConsumedPerBird,

        feedCostPerPoultry:
            totalFeedCostPerBird,

        totalFeedCost,

        feedHistory,
    }
}

const calculateHistoricalLivestockFeed = async ({
    Feed,
    animalType,
    purchaseDate,
    quantity,
    purchasePrice,
}) => {
    const safeQuantity = Math.max(Number(quantity) || 0, 0)

    if (!Feed || !animalType || !purchaseDate || safeQuantity <= 0) {
        return {
            totalFeedConsumed: 0,
            livestockFeedConsumed: 0,
            feedCostPerLivestock: 0,
            totalFeedCost: 0,
            feedHistory: [],
        }
    }

    const purchase = new Date(purchaseDate)
    const today = new Date()
    const purchasePriceNum = Number(purchasePrice) || 0

    if (purchasePriceNum < 0) {
        throw new Error('Invalid livestock purchasePrice.')
    }

    if (Number.isNaN(purchase.getTime())) {
        throw new Error('Invalid livestock purchaseDate.')
    }

    if (purchase > today) {
        throw new Error('Livestock purchaseDate cannot be in the future.')
    }

    // Calculate how many days the livestock has been in the farm.
    const elapsedDays = Math.max(
        Math.floor((today - purchase) / MS_PER_DAY),
        0
    )


   const stagePeriods = getLivestockFeedStagePeriods(
    0,
    elapsedDays
    )

    if (stagePeriods.length === 0) {
        return {
            totalFeedConsumed: 0,
            livestockFeedConsumed: 0,
            feedCostPerLivestock: 0,
            totalFeedCost: 0,
            feedHistory: [],
        }
    }

    let totalFeedConsumedforLivestock = 0
    let totalFeedCostforLivestock = 0

    const feedHistory = []

    
    for (const period of stagePeriods) {
    const feedStage = period.stage

    const feed = await getFeedForStage(
        Feed,
        animalType,
        feedStage
    )

    if (!feed) {
        throw new ApiError(
            404,
            `No ${animalType} ${feedStage} feed is configured for this farm.`,
            {
                animalType,
                feedStage,
                purchaseDate,
            }
        )
    }

    const totalDailyFeed = Math.max(
        Number(feed.totalLivestockFeedConsumedPerday) || 0,
        0
    )

    const dailyFeedforLivestock =
            safeQuantity > 0
                ? totalDailyFeed / safeQuantity
                : 0
    

    const pricePerKg = Math.max(
        Number(feed.feedPricePerkg) || 0,
        0
    )

    const stagePurchasePriceforLivestock = 
    purchasePriceNum / safeQuantity;

    const stageFeedConsumedforLivestock =
        dailyFeedforLivestock * period.days

    const stageFeedCostforLivestock =
        stageFeedConsumedforLivestock * pricePerKg

    const stageTotalFeedCost =
        stageFeedCostforLivestock * safeQuantity

    totalFeedConsumedforLivestock +=
        stageFeedConsumedforLivestock

    totalFeedCostforLivestock +=
        stageFeedCostforLivestock

    feedHistory.push({
        feedStage,
        feedName: feed.feedName,
        feedType: feed.feedType,
        feedCategory: feed.feedCategory,

        livestockFeedConsumed:
            stageFeedConsumedforLivestock,

        feedCostPerLivestock:
            stageFeedCostforLivestock,

        totalFeedCost:
            stageTotalFeedCost,

            costPrice:
            stageTotalFeedCost + stagePurchasePriceforLivestock,

        startAgeInDays:
            period.startAgeInDays,

        endAgeInDays:
            period.endAgeInDays,

        days:
            period.days,

        recordedAt: today,
    })
}

    const totalFeedConsumed =
        totalFeedConsumedforLivestock * safeQuantity

        const totalFeedCost =
            totalFeedCostforLivestock * safeQuantity

    return {
        totalFeedConsumed,

        livestockFeedConsumed:
            totalFeedConsumedforLivestock,

        feedCostPerLivestock:
            totalFeedCostforLivestock,

        totalFeedCost,

        feedHistory,
    }
}

module.exports = { calculateHistoricalPoultryFeed,calculateHistoricalLivestockFeed }