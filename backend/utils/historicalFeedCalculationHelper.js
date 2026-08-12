const {
    getPoultryFeedStagePeriods,
    getFeedForStage,
} = require('./feedStageHelper.js')


/**
 * Calculates historical poultry feed consumption and cost.
 *
 * IMPORTANT:
 * CloudFarm uses purchaseDate as the starting point
 * for poultry age/feed accounting.
 *
 * Example:
 *
 * purchaseDate = 70 days ago
 * quantity     = 100 birds
 *
 * The function calculates:
 *
 * Starter consumption
 * + Grower consumption
 * + Finisher consumption
 *
 * It also calculates the corresponding feed costs.
 *
 * This function DOES NOT use birthDay.
 *
 * This function DOES NOT allow fallback to another feed stage.
 */

const calculateHistoricalPoultryFeed = async ({
    Feed,
    animalType,
    purchaseDate,
    quantity,
}) => {
    const safeQuantity = Math.max(Number(quantity) || 0, 0)

    if (!Feed || !animalType || !purchaseDate || safeQuantity <= 0) {
        return {
            totalFeedConsumed: 0,
            poultryConsumePerBird: 0,
            poultryConsumePerkg: 0,
            feedCostPerPoultry: 0,
            totalFeedCost: 0,
            feedHistory: [],
        }
    }

    const purchase = new Date(purchaseDate)
    const today = new Date()

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
            poultryConsumePerkg: 0,
            feedCostPerPoultry: 0,
            totalFeedCost: 0,
            feedHistory: [],
        }
    }

    let totalFeedConsumedPerBird = 0
    let totalFeedCostPerBird = 0

    const feedHistory = []

    // for (const period of stagePeriods) {
    //     const feedStage = period.stage
    //     const feedStageKey =
    //         `${String(animalType).trim().toLowerCase()}:${feedStage}`

    //      const feed = feedStageMap.get(feedStageKey)
    //     if (!feed) {
    //         throw new ApiError(
    //             404,
    //             `No ${animalType} ${feedStage} feed is configured for this farm.`,

    //             {
    //                 animalType,
    //                 feedStage,
    //                 purchaseDate,
    //             }
    //         )
    //     }

    //     const dailyRate =
    //         Math.max(
    //             Number(feed.poultryDailyConsumption) || 0,
    //             0
    //         )

    //     const pricePerKg =
    //         Math.max(
    //             Number(feed.feedPricePerkg) || 0,
    //             0
    //         )

    //     const stageFeedConsumedPerBird =
    //         dailyRate * period.days

    //     const stageFeedCostPerBird =
    //         stageFeedConsumedPerBird * pricePerKg

    //     const stageTotalFeedConsumed =
    //         stageFeedConsumedPerBird * safeQuantity

    //     const stageTotalFeedCost =
    //         stageFeedCostPerBird * safeQuantity

    //     totalFeedConsumedPerBird +=
    //         stageFeedConsumedPerBird

    //     totalFeedCostPerBird +=
    //         stageFeedCostPerBird

    //     feedHistory.push({
    //         feedStage,
    //         feedName: feed.feedName,
    //         feedType: feed.feedType,
    //         feedCategory: feed.feedCategory,

    //         poultryConsumePerkg:
    //             stageFeedConsumedPerBird,

    //         feedCostPerPoultry:
    //             stageFeedCostPerBird,

    //         totalFeedCost:
    //             stageTotalFeedCost,

    //         totalCost:
    //             stageTotalFeedCost,

    //         costPerPoultry:
    //             stageFeedCostPerBird,

    //         totalCostPerPoultry:
    //             stageFeedCostPerBird,

    //         startAgeInDays:
    //             period.startAgeInDays,

    //         endAgeInDays:
    //             period.endAgeInDays,

    //         days:
    //             period.days,

    //         recordedAt:
    //             today,
    //     })
    // }
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

    const dailyRate = Math.max(
        Number(feed.poultryDailyConsumption) || 0,
        0
    )

    const pricePerKg = Math.max(
        Number(feed.feedPricePerkg) || 0,
        0
    )

    const stageFeedConsumedPerBird =
        dailyRate * period.days

    const stageFeedCostPerBird =
        stageFeedConsumedPerBird * pricePerKg

    const stageTotalFeedConsumed =
        stageFeedConsumedPerBird * safeQuantity

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

        totalCost:
            stageTotalFeedCost,

        costPerPoultry:
            stageFeedCostPerBird,

        totalCostPerPoultry:
            stageFeedCostPerBird,

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

    return {
        totalFeedConsumed,

        poultryConsumePerBird:
            totalFeedConsumedPerBird,

        feedCostPerPoultry:
            totalFeedCostPerBird,

        totalFeedCost:
            totalFeedCostPerBird * safeQuantity,

        feedHistory,
    }
}


module.exports = calculateHistoricalPoultryFeed