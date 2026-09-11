const logger = require('../utils/logger')
const ApiError = require('../utils/ApiError')
const { getFeedStage, calculateAge, parseFeedType } = require('../utils/feedStageHelper')

const BULK_WRITE_BATCH_SIZE = 500

const normalizeDate = (value) => {
  const candidate = new Date(value)
  return Number.isNaN(candidate.getTime()) ? new Date() : candidate
}

const startOfDay = (date) => {
  const safeDate = normalizeDate(date)
  return new Date(safeDate.getFullYear(), safeDate.getMonth(), safeDate.getDate())
}

const getDaysBetween = (startDate, endDate) => {
  const start = startOfDay(startDate || new Date())
  const end = startOfDay(endDate || new Date())
  return Math.max(Math.floor((end - start) / (1000 * 60 * 60 * 24)), 0)
}

const toSafeNumber = (value, fallback = 0) => {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : fallback
}

const validateFeedConsumptionInputs = (feed, farmModels) => {
  if (!feed || typeof feed !== 'object') {
    throw new TypeError('Feed document is required to update consumption.')
  }

  if (!feed._id) {
    throw new TypeError('Feed document must contain a valid _id.')
  }

  if (!farmModels || typeof farmModels !== 'object') {
    throw new TypeError('farmModels is required and must be an object.')
  }

  if (!farmModels.Feed || !farmModels.Poultry || !farmModels.LiveStock) {
    throw new TypeError('farmModels must include Feed, Poultry, and LiveStock models.')
  }
}

const getStageRecords = (records, stage) => {
  if (!Array.isArray(records)) {
    logger.warn('getStageRecords received invalid records; expected an array.', { stage })
    return []
  }

  if (!stage || typeof stage !== 'string') {
    return records
  }

  const normalizedStage = stage.trim().toLowerCase()
  if (!normalizedStage) {
    return records
  }

  return records.reduce((matchingRecords, record) => {
    if (!record || typeof record !== 'object') {
      return matchingRecords
    }

    try {
      const birthDate = record.purchaseDate || new Date()
      const safeBirthDate = normalizeDate(birthDate)
      const { ageInDays } = calculateAge(safeBirthDate)
      const batchStage = getFeedStage(ageInDays, record.type)

      if ((batchStage || '').toLowerCase() === normalizedStage) {
        matchingRecords.push(record)
      }
    } catch (error) {
      logger.warn('Skipping invalid record while filtering feed stage records.', {
        stage,
        error: error.message,
        stack: error.stack,
      })
    }

    return matchingRecords
  }, [])
}

const buildFeedQueries = (feed) => {
  const parsed = parseFeedType(feed.feedType)
  const poultryQuery = { status: { $ne: 'sold' } }
  const livestockQuery = { status: { $ne: 'sold' } }

  if (parsed.poultryType) {
    poultryQuery.type = parsed.poultryType
  } else if (feed.animalType && ['broiler', 'layer'].includes(feed.animalType)) {
    poultryQuery.type = feed.animalType
  }

  if (parsed.animalType && !parsed.poultryType) {
    livestockQuery.type = parsed.animalType
  } else if (feed.animalType && !['broiler', 'layer'].includes(feed.animalType)) {
    livestockQuery.type = feed.animalType
  }

  return { poultryQuery, livestockQuery }
}

const createPoultryBulkOperation = (
  bird,
  feedToUse,
  ageInDays,
  ageInWeeks,
  currentFeedStage,
  today
) => {
  const quantity = Math.max(toSafeNumber(bird.quantity), 0)
  const existingFeedConsumed = Math.max(toSafeNumber(bird.totalFeedConsumed), 0)
  const existingPurchasePrice = Math.max(toSafeNumber(bird.purchasePrice), 0)
  const existingTotalFeedCost = Math.max(toSafeNumber(bird.totalFeedCost),0)
 

  /*
   * Determine lastFeedUpdate precedence:
   * 1) Use explicit bird.lastFeedUpdate when present (preferred).
   * 2) Fallback to bird.purchaseDate when lastFeedUpdate is absent.
   * 3) Finally fallback to today when neither is available.
   *
   * NOTE: Do NOT override a valid lastFeedUpdate with `today`
   * merely because totalFeedConsumed > 0. That would prevent
   * adding incremental consumption since the true last update
   * and may double-count or skip incremental days.
   */
  const defaultLastUpdate = bird.lastFeedUpdate || bird.purchaseDate || today

  const lastFeedUpdate = startOfDay(normalizeDate(defaultLastUpdate))
  const currentDay = startOfDay(normalizeDate(today))
  const daysSinceLastUpdate = Math.max(getDaysBetween(lastFeedUpdate, currentDay), 0)

  const dailyRate = Math.max(toSafeNumber(feedToUse.poultryDailyConsumption), 0)

  const incrementalFeedPerBird = dailyRate * daysSinceLastUpdate
  const incrementalTotalFeed = incrementalFeedPerBird * quantity

  const nextFeedConsumed = existingFeedConsumed + incrementalTotalFeed
  const pricePerKg = Math.max(toSafeNumber(feedToUse.feedPricePerkg),0)
  const incrementalFeedCostPerBird =incrementalFeedPerBird * pricePerKg
  const incrementalTotalFeedCost =incrementalTotalFeed * pricePerKg
  const nextTotalFeedCost = existingTotalFeedCost + incrementalTotalFeedCost
  const perBirdConsumed = quantity > 0 ? nextFeedConsumed / quantity : 0

  const feedCostPerPoultry = quantity > 0 ? nextTotalFeedCost / quantity: 0
  // const totalFeedCost = perBirdConsumed * quantity * pricePerKg
  const totalCost = existingPurchasePrice + nextTotalFeedCost
  const costPerPoultry = quantity > 0 ? totalCost / quantity : 0

  const updateData = {
  ageInDays,
  ageInWeeks,

  currentFeedStage,
  feedStage: currentFeedStage,

  currentFeedType: feedToUse.feedType,
  currentFeedName: feedToUse.feedName,

  totalFeedConsumed: nextFeedConsumed,
  poultryConsumePerBird: perBirdConsumed,

  feedCostPerPoultry,
  totalFeedCost: nextTotalFeedCost,

  totalCost,
  costPerPoultry,
  totalCostPerPoultry: costPerPoultry,
  }

  if (daysSinceLastUpdate > 0) {
  updateData.lastFeedUpdate = currentDay
  }

  return {
  updateOne: {
    filter: { _id: bird._id, status: { $ne: 'sold' } },
    update: { $set: updateData },
  },
  }
}


const createLivestockBulkOperation = (animal, feedToUse, ageInDays,ageInWeeks, currentFeedStage, today) => {
  const defaultLastUpdate = animal.lastFeedUpdate || animal.purchaseDate || today
  const lastFeedUpdate = startOfDay(normalizeDate(defaultLastUpdate))
  const currentDay = startOfDay(normalizeDate(today))
  const daysSinceLastUpdate = Math.max(getDaysBetween(lastFeedUpdate, currentDay),0)
  const quantity = Math.max(toSafeNumber(animal.quantity), 0)
  const dailyRate = Math.max(toSafeNumber(feedToUse.livestockDailyConsumption),0)
  const pricePerKg = Math.max(toSafeNumber(feedToUse.feedPricePerkg),0)
  const existingFeedConsumed = toSafeNumber(animal.totalFeedConsumed)
  const existingPurchasePrice = toSafeNumber(animal.purchasePrice)
  const existingTotalFeedCost = Math.max(toSafeNumber(animal.totalFeedCost),0)

  
  
    const incrementalPerAnimal = dailyRate * daysSinceLastUpdate
    const incrementalTotalFeed = incrementalPerAnimal * quantity
    const nextFeedConsumed = existingFeedConsumed + incrementalTotalFeed

    const incrementalTotalFeedCost =incrementalTotalFeed * pricePerKg
    const nextTotalFeedCost = existingTotalFeedCost + incrementalTotalFeedCost

  const perAnimalConsumed = quantity > 0 ? nextFeedConsumed / quantity : 0
  const feedCostPerLivestock = quantity > 0 ? nextTotalFeedCost / quantity : 0
 
  const totalCost = existingPurchasePrice + nextTotalFeedCost
  const updateData = {
    ageInDays,
    ageInWeeks,
    feedStage: currentFeedStage,
    currentFeedType: feedToUse.feedType,
    currentFeedName: feedToUse.feedName,
    totalFeedConsumed: nextFeedConsumed,
    livestockFeedConsumed: perAnimalConsumed,
    feedCostPerLivestock,
    totalFeedCost:nextTotalFeedCost,
    costPrice:totalCost,
    totalCost,
  }

  if (daysSinceLastUpdate > 0) {
    updateData.lastFeedUpdate = currentDay
  }

  return {
    updateOne: {
      filter: { _id: animal._id, status: { $ne: 'sold' } },
      update: {
        $set: updateData,
      },
    },
  }
}

const createEggBulkOperation = (egg, dailyEgg, price,damage)=>{
  const poultryType = egg.PoultryType
  const avgDailyEgg = Math.max(toSafeNumber(dailyEgg.avgDailyEgg), 0)
  const salePrice = Math.max(toSafeNumber(price.salePrice), 0)
  const damageEgg = Math.max(toSafeNumber(damage.damageEgg), 0)
  
  
}

const buildFeedStageMap = async (Feed, animalType) => {
  const normalizedAnimalType = String(animalType || '').trim().toLowerCase()
  const feedStageMap = new Map()

  if (!normalizedAnimalType) {
    return feedStageMap
  }

  const feedDocuments = await Feed.find({
    $or: [
      { animalType: { $regex: new RegExp(`^${normalizedAnimalType}$`, 'i') } },
      { feedType: { $regex: new RegExp(`^${normalizedAnimalType}`, 'i') } },
    ],
  })

  for (const feedDocument of feedDocuments) {
    const feedRecord = feedDocument.toObject ? feedDocument.toObject() : feedDocument
    const parsedFeed = parseFeedType(feedRecord.feedType)
    const feedStage = String(feedRecord.feedCategory || parsedFeed.feedCategory || 'default').trim()
    const mapKey = `${normalizedAnimalType}:${feedStage}`

    if (!feedStageMap.has(mapKey)) {
      feedStageMap.set(mapKey, feedRecord)
    }
  }

  return feedStageMap
}

const recalculatePoultry = async (feed, farmModels) => {
  const { Poultry, Feed } = farmModels
  try {
    const animalType = feed.animalType || feed.poultryType || parseFeedType(feed.feedType).animalType
    if (!animalType) {
      return
    }

    const birds = await Poultry.find({ type: animalType, status: { $ne: 'sold' } })
    if (!birds || birds.length === 0) {
      logger.info('Poultry recalculation skipped because no active poultry records were found.', {
        animalType,
        feedId: feed?._id,
      })
      return
    }

    const stageBirds = feed.feedCategory ? getStageRecords(birds, feed.feedCategory) : birds
    const totalBirds = stageBirds.reduce((sum, bird) => sum + Math.max(toSafeNumber(bird.quantity), 0), 0)

    if (totalBirds <= 0) {
      await Feed.findByIdAndUpdate(
        feed._id,
        {
          poultryDailyConsumption: 0,
          totalDailyConsumption: toSafeNumber(feed.livestockDailyConsumption),
        },
        { returnDocument: 'after' }
      )
      logger.warn('Poultry recalculation produced zero stage birds; feed usage was reset to zero.', {
        feedId: feed?._id,
        animalType,
        totalBirds,
      })
      return
    }

    const totalPoultryFeedPerday = toSafeNumber(feed.totalPoultryFeedConsumedPerday)
    const newPoultryDailyConsumption = totalPoultryFeedPerday > 0 ? totalPoultryFeedPerday / totalBirds : 0

    const updatedFeed = await Feed.findByIdAndUpdate(
      feed._id,
      {
        poultryDailyConsumption: newPoultryDailyConsumption,
        totalDailyConsumption: newPoultryDailyConsumption + toSafeNumber(feed.livestockDailyConsumption),
      },
      { returnDocument: 'after' }
    )

    logger.info('Poultry feed recalculation updated feed totals.', {
      feedId: feed?._id,
      animalType,
      totalBirds,
      newPoultryDailyConsumption,
    })

    const feedStageMap = await buildFeedStageMap(Feed, animalType)
    const today = startOfDay(new Date())

    const poultryToUpdate = feed.feedCategory ? stageBirds : birds
    let operationCount = 0
    const operations = []

    for (const bird of poultryToUpdate) {
      const purchaseDate = bird.purchaseDate || today
      const { ageInDays, ageInWeeks } = calculateAge(purchaseDate)
      const currentFeedStage = getFeedStage(ageInDays, bird.type)
      const feedStageKey = `${String(bird.type || animalType).toLowerCase()}:${currentFeedStage || 'default'}`
      const feedForStage = feedStageMap.get(feedStageKey)

      if (!feedForStage) {
        const errorMessage = `No ${String(bird.type || animalType).trim()} ${currentFeedStage || 'unknown'} feed is configured for this farm.`
        logger.error('Missing stage-specific feed for poultry recalculation.', {
          farmId: feed?.farmId || bird?.farmId || null,
          animalType: bird.type || animalType,
          feedStage: currentFeedStage,
          batchId: bird.batchId || bird._id,
          feedId: feed?._id || null,
          message: errorMessage,
        })
        throw new ApiError(404, errorMessage, {
          animalType: bird.type || animalType,
          feedStage: currentFeedStage,
          batchId: bird.batchId || bird._id,
          farmId: feed?.farmId || bird?.farmId || null,
        })
      }

      const feedToUse = feedForStage

      operations.push(createPoultryBulkOperation(bird, feedToUse, ageInDays, ageInWeeks, currentFeedStage, today))

      if (operations.length >= BULK_WRITE_BATCH_SIZE) {
        await Poultry.bulkWrite(operations)
        operationCount += operations.length
        operations.length = 0
      }
    }

    if (operations.length > 0) {
      await Poultry.bulkWrite(operations)
      operationCount += operations.length
    }

    logger.info('Poultry feed recalculation completed successfully with bulk write.', {
      feedId: feed?._id,
      operationCount,
    })
  } catch (error) {
    logger.error('Failed to recalculate poultry feed', {
      feedId: feed?._id,
      error: error.message,
      stack: error.stack,
    })
    throw error
  }
}

const recalculateLivestock = async (feed, farmModels) => {
  const { LiveStock, Feed } = farmModels
  try {
    const livestockType = feed.animalType || parseFeedType(feed.feedType).animalType
    if (!livestockType) return

    const animals = await LiveStock.find({ type: livestockType, status: { $ne: 'sold' } })
    if (!animals || animals.length === 0) {
      logger.info('Poultry recalculation skipped because no active poultry records were found.',{
        livestockType,
        feedId:feed?._id
      })
    }

    const stageAnimals = feed.feedCategory ? getStageRecords(animals, feed.feedCategory) : animals
    const totalAnimals = stageAnimals.reduce((sum, animal) => sum + Math.max(toSafeNumber(animal.quantity), 0), 0)


    if (totalAnimals <= 0) {
      await Feed.findByIdAndUpdate(
        feed._id,
        {
          livestockDailyConsumption: 0,
          totalDailyConsumption: toSafeNumber(feed.poultryDailyConsumption),
        },
        { returnDocument: 'after' }
      )
      logger.warn('Livestock recalculation produced zero animals; feed usage was reset to zero.', {
        feedId: feed?._id,
        animalType: livestockType,
        totalAnimals,
      })
      return
    }

    const totalLivestockFeedPerday = toSafeNumber(feed.totalLivestockFeedConsumedPerday)
    const newLivestockDailyConsumption = totalLivestockFeedPerday > 0 ? totalLivestockFeedPerday / totalAnimals : 0

    const updatedFeed = await Feed.findByIdAndUpdate(
      feed._id,
      {
        livestockDailyConsumption: newLivestockDailyConsumption,
        totalDailyConsumption: newLivestockDailyConsumption + toSafeNumber(feed.poultryDailyConsumption),
      },
      { returnDocument: 'after' }
    )

    logger.info('Livestock feed recalculation updated feed totals.', {
      feedId: feed?._id,
      animalType: livestockType,
      totalAnimals,
    })

    const feedStageMap = await buildFeedStageMap(Feed, livestockType)
    const today = startOfDay(new Date())
    const livestockToUpdate = feed.feedCategory ? stageAnimals : animals
    let operationCount = 0
    const operations = []

    for (const animal of livestockToUpdate) {
      const purchaseDate = animal.purchaseDate || today
      const { ageInDays, ageInWeeks } = calculateAge(purchaseDate)
      const currentFeedStage = getFeedStage(ageInDays, animal.type)
      const feedStageKey = `${String(animal.type || livestockType).toLowerCase()}:${currentFeedStage || 'default'}`
      const feedForStage = feedStageMap.get(feedStageKey)

      if (!feedForStage) {
        const errorMessage = `No ${String(animal.type || livestockType).trim()} ${currentFeedStage || 'unknown'} feed is configured for this farm.`
        logger.error('Missing stage-specific feed for livestock recalculation.', {
          farmId: feed?.farmId || animal?.farmId || null,
          animalType: animal.type || livestockType,
          feedStage: currentFeedStage,
          animalId: animal.tagNumber || animal._id,
          feedId: feed?._id || null,
          message: errorMessage,
        })
        throw new ApiError(404, errorMessage, {
          animalType: animal.type || livestockType,
          feedStage: currentFeedStage,
          animalId: animal.tagNumber || animal._id,
          farmId: feed?.farmId || animal?.farmId || null,
        })
      }

      const feedToUse = feedForStage

      operations.push(createLivestockBulkOperation(animal, feedToUse, ageInDays,ageInWeeks, currentFeedStage, today))

      if (operations.length >= BULK_WRITE_BATCH_SIZE) {
        await LiveStock.bulkWrite(operations)
        operationCount += operations.length
        operations.length = 0
      }
    }

    if (operations.length > 0) {
      await LiveStock.bulkWrite(operations)
      operationCount += operations.length
    }

    logger.info('Livestock feed recalculation completed successfully with bulk write.', {
      feedId: feed?._id,
      operationCount,
    })
  } catch (error) {
    logger.error('Failed to recalculate livestock feed', {
      feedId: feed?._id,
      error: error.message,
      stack: error.stack,
    })
    throw error
  }
}

const updateFeedConsumption = async (feed, farmModels, retry = 0) => {
  validateFeedConsumptionInputs(feed, farmModels)
  const { Feed, Poultry, LiveStock } = farmModels

  const now = new Date()
  const lastUpdate = feed.lastConsumptionUpdate
    ? normalizeDate(feed.lastConsumptionUpdate)
    : feed.purchaseDate
      ? normalizeDate(feed.purchaseDate)
      : startOfDay(new Date())

  const startToday = startOfDay(now)
  const startLast = startOfDay(lastUpdate)
  const diffDays = getDaysBetween(startLast, startToday)

  if (diffDays <= 0) {
    logger.info('Feed consumption update skipped; no elapsed days since last update.', {
      feedId: feed._id,
      lastConsumptionUpdate: feed.lastConsumptionUpdate,
      diffDays,
    })
    return feed
  }

  const { poultryQuery, livestockQuery } = buildFeedQueries(feed)
  const [poultryBatches, liveStockAnimals] = await Promise.all([
    poultryQuery.type ? Poultry.find(poultryQuery) : [],
    livestockQuery.type ? LiveStock.find(livestockQuery) : [],
  ])

  const stageBirds = getStageRecords(poultryBatches, feed.feedCategory)
  const totalPoultryCount = stageBirds.reduce((sum, b) => sum + Math.max(toSafeNumber(b.quantity), 0), 0)
  const stageAnimals = getStageRecords(liveStockAnimals, feed.feedCategory)
  const totalLivestockCount = stageAnimals.reduce((sum, a) => sum + Math.max(toSafeNumber(a.quantity), 0), 0)

  const totalPoultryFeedPerday = toSafeNumber(feed.totalPoultryFeedConsumedPerday)
  const totalLivestockFeedPerday = toSafeNumber(feed.totalLivestockFeedConsumedPerday)
  const poultryDailyRate = totalPoultryCount > 0 ? totalPoultryFeedPerday / totalPoultryCount : 0
  const livestockDailyRate = totalLivestockCount > 0 ? totalLivestockFeedPerday / totalLivestockCount : 0

  const totalPoultryRequired = totalPoultryCount * poultryDailyRate * diffDays
  const totalLivestockRequired = totalLivestockCount * livestockDailyRate * diffDays
  const totalDecrease = totalPoultryRequired + totalLivestockRequired
  const available = toSafeNumber(feed.quantity)
  const actualDecrease = Math.min(totalDecrease, available)

  const query = { _id: feed._id }
  if (feed.lastConsumptionUpdate) {
    query.lastConsumptionUpdate = normalizeDate(feed.lastConsumptionUpdate)
  } else {
    query.lastConsumptionUpdate = { $exists: false }
  }

  const updatedFeed = await Feed.findOneAndUpdate(
    query,
    {
      $inc: {
        consumption: actualDecrease,
        quantity: -actualDecrease,
      },
      $set: {
        lastConsumptionUpdate: startToday,
        poultryDailyConsumption: poultryDailyRate,
        livestockDailyConsumption: livestockDailyRate,
        totalDailyConsumption: poultryDailyRate + livestockDailyRate,
      },
    },
    { returnDocument: 'after' }
  )

  if (updatedFeed) {
    logger.info('Feed consumption successfully updated.', {
      feedId: feed._id,
      diffDays,
      actualDecrease,
      totalPoultryCount,
      totalLivestockCount,
      poultryDailyRate,
      livestockDailyRate,
    })
    return updatedFeed
  }

  if (retry >= 1) {
    const latestFeed = await Feed.findById(feed._id)
    if (!latestFeed) {
      throw new Error('Feed document no longer exists while retrying consumption update.')
    }
    logger.warn('Feed consumption update conflict remained after retry; returning latest feed snapshot.', {
      feedId: feed._id,
    })
    return latestFeed
  }

  logger.warn('Detected concurrent feed update; retrying consumption update with latest source.', {
    feedId: feed._id,
  })

  const latestFeed = await Feed.findById(feed._id)
  if (!latestFeed) {
    throw new Error('Feed document no longer exists while retrying consumption update.')
  }

  return updateFeedConsumption(latestFeed, farmModels, retry + 1)
}

const syncFeedConsumption = async (feed, farmModels) => {
  const { Feed } = farmModels
  const updatedFeed = await updateFeedConsumption(feed, farmModels)

  try {
    await recalculatePoultry(updatedFeed, farmModels)
    await recalculateLivestock(updatedFeed, farmModels)

    const finalFeed = await Feed.findById(updatedFeed._id)
    return finalFeed || updatedFeed
  } catch (error) {
    logger.error('Failed to synchronize feed consumption workflow.', {
      feedId: feed._id,
      error: error.message,
      stack: error.stack,
    })
    throw error
  }
}

const recalculateLivestockForTypeAndStage = async (animalType, feedCategory, farmModels) => {
  const { Feed, LiveStock } = farmModels
  try {
    if (!animalType) return

    const feedQuery = { animalType }
    if (feedCategory) feedQuery.feedCategory = feedCategory
    const feeds = await Feed.find(feedQuery)
    if (!feeds || feeds.length === 0) return

    const animals = await LiveStock.find({ type: animalType, status: { $ne: 'sold' } })
    const stageAnimals = feedCategory ? getStageRecords(animals, feedCategory) : animals
    const stageCount = stageAnimals.reduce((s, a) => s + Math.max(toSafeNumber(a.quantity), 0), 0)
    const totalCount = animals.reduce((s, a) => s + Math.max(toSafeNumber(a.quantity), 0), 0)
    const effectiveCount = stageCount > 0 ? stageCount : totalCount

    for (const feedDocument of feeds) {
      const totalLivestockFeedPerday = toSafeNumber(feedDocument.totalLivestockFeedConsumedPerday)
      const normalizedTotal = totalLivestockFeedPerday > 0 ? totalLivestockFeedPerday : toSafeNumber(feedDocument.livestockDailyConsumption) * Math.max(effectiveCount, 0)
      const newRate = effectiveCount > 0 ? normalizedTotal / effectiveCount : 0

      const updatedFeed = await Feed.findByIdAndUpdate(
        feedDocument._id,
        {
          livestockDailyConsumption: newRate,
          totalLivestockFeedConsumedPerday: normalizedTotal,
          totalDailyConsumption: newRate + toSafeNumber(feedDocument.poultryDailyConsumption),
        },
        { returnDocument: 'after' }
      )

      try {
        await recalculateLivestock(updatedFeed, farmModels)
      } catch (err) {
        logger.error('Failed to recalculate livestock after feed update.', {
          feedId: feedDocument._id,
          error: err && err.message ? err.message : err,
          stack: err && err.stack ? err.stack : undefined,
        })
        throw err
      }
    }
  } catch (error) {
    logger.error('Failed to recalculate livestock for type and stage.', {
      animalType,
      feedCategory,
      error: error.message,
      stack: error.stack,
    })
    throw error
  }
}

module.exports = {
  updateFeedConsumption,
  syncFeedConsumption,
  recalculatePoultry,
  recalculateLivestock,
  recalculateLivestockForTypeAndStage,
}
