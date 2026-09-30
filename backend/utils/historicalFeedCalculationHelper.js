const {
    getFeedForStage,
    getFeedStagePeriodsFromStartingStage,
    calculatePoultryAge,
    resolvePoultryPurchaseAgeDays,
} = require('./feedStageHelper.js')
const ApiError = require('./ApiError')
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const calculateHistoricalPoultryFeed = async ({
    Feed,
    animalType,
    purchaseDate,
    purchasePrice,
    quantity,
    startingStage = 'starter',
    purchaseAgeDays,
    skipMissingFeed = false,
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
    const resolvedPurchaseAgeDays = resolvePoultryPurchaseAgeDays(animalType, startingStage, purchaseAgeDays)

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
    const { elapsedDays } = calculatePoultryAge(purchase, resolvedPurchaseAgeDays, today)
    const stagePeriods = getFeedStagePeriodsFromStartingStage(
        animalType,
        elapsedDays,
        startingStage,
        resolvedPurchaseAgeDays
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
        if (skipMissingFeed) continue
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

    const configuredDailyRate = Number(feed.poultryDailyConsumption)
    const legacyDailyFeed = Number(feed.totalPoultryFeedConsumedPerday) || 0
    const dailyFeedPerBird = Math.max(
        Number.isFinite(configuredDailyRate) && configuredDailyRate > 0
            ? configuredDailyRate
            : safeQuantity > 0 ? legacyDailyFeed / safeQuantity : 0,
        0
    )


    const pricePerKg = Math.max(
        Number(feed.feedPricePerkg) || 0,
        0
    )

    const stagePurchasePricePerBird = 
    purchasePriceNum / safeQuantity;

    const stageFeedConsumedPerBird =
        dailyFeedPerBird * period.days

    const stageTotalFeedConsumed =
        stageFeedConsumedPerBird * safeQuantity

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

        totalFeedConsumed:
            stageTotalFeedConsumed,

        bagWeightKg: Number(feed.poultryBagWeightKg || feed.bagWeightKg) > 0
            ? Number(feed.poultryBagWeightKg || feed.bagWeightKg)
            : undefined,

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
        startDate: new Date(Date.UTC(purchase.getUTCFullYear(), purchase.getUTCMonth(), purchase.getUTCDate())
            + (period.startAgeInDays - resolvedPurchaseAgeDays) * MS_PER_DAY),
        endDate: new Date(Date.UTC(purchase.getUTCFullYear(), purchase.getUTCMonth(), purchase.getUTCDate())
            + (period.endAgeInDays - resolvedPurchaseAgeDays - (period.days > 0 ? 1 : 0)) * MS_PER_DAY),
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
    startingStage = 'starter',
    purchaseAgeDays,
    skipMissingFeed = false,
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


   const stagePeriods = getFeedStagePeriodsFromStartingStage(
        animalType,
        elapsedDays,
        startingStage,
        purchaseAgeDays
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
        if (skipMissingFeed) continue
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

    const configuredDailyRate = Number(feed.livestockDailyConsumption)
    const legacyDailyFeed = Number(feed.totalLivestockFeedConsumedPerday) || 0
    const dailyFeedforLivestock = Math.max(
        Number.isFinite(configuredDailyRate) && configuredDailyRate > 0
            ? configuredDailyRate
            : safeQuantity > 0 ? legacyDailyFeed / safeQuantity : 0,
        0
    )
    

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

        bagWeightKg: Number(feed.livestockBagWeightKg || feed.bagWeightKg) > 0
            ? Number(feed.livestockBagWeightKg || feed.bagWeightKg)
            : undefined,

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