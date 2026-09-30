const Feed = require("../models/feed")
const Poultry = require("../models/poultry")
const LiveStock = require('../models/liveStock')
const logger = require('../utils/logger')
const {
    getFeedStageFromStartingStage,
  calculateAge,
  parseFeedType,
} = require('../utils/feedStageHelper')
const {
  calculateBatchConsumption,
  calculateLivestockConsumption,
  calculateFeedForPoultry,
} = require('../utils/feedCalculator')
const {
  syncFeedConsumption,
    updateFeedConsumption,
    recalculateFeedDependents,
  recalculatePoultry,
  recalculateLivestock,
  recalculateLivestockForTypeAndStage,
} = require('../services/feedConsumptionService')
const { sendNotification } = require('../services/emailService')
const { normalizeFeedQuantity, calculateFeedPricePerKg } = require('../utils/feedQuantity')

const LOW_FEED_THRESHOLD = Number(process.env.LOW_FEED_THRESHOLD) || 20

const normalizeDailyFeedInput = (quantity, unit = 'kg', bagWeightKg) => {
    if (quantity === undefined || quantity === null || quantity === '' || Number(quantity) === 0) {
        return { quantityKg: 0, quantityEntered: 0, unit: 'kg', bagWeightKg: null }
    }
    return normalizeFeedQuantity({ quantity, unit, bagWeightKg })
}

exports.addFeed = async(req,res)=>{
    const { Feed, Poultry,LiveStock } = req.farmModels
    const {feedType,feedCategory,quantity,unit,bagWeightKg,cost,purchaseDate,supplier,feedName,totalPoultryFeedConsumedPerday,totalLivestockFeedConsumedPerday,animalType,poultryFeedUnit,poultryBagWeightKg,livestockFeedUnit,livestockBagWeightKg} = req.body
    if(!feedType || !quantity || !cost || !purchaseDate || !supplier || !feedName || !animalType){
        return res.status(400).json({message:"Input fields are required..."})
    }
    let savedFeed
    let recalculationCompleted = false
    try {

        const existingFeed = await Feed.findOne({feedType, feedCategory})
        if(existingFeed){
            return res.status(400).json({message:'This feed already exist'})
        }
        let normalizedQuantity
        try {
            normalizedQuantity = normalizeFeedQuantity({ quantity, unit, bagWeightKg })
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message })
        }
        const qtn = normalizedQuantity.quantityKg
        
        const poultryRate = normalizeDailyFeedInput(totalPoultryFeedConsumedPerday, poultryFeedUnit, poultryBagWeightKg)
        const livestockRate = normalizeDailyFeedInput(totalLivestockFeedConsumedPerday, livestockFeedUnit, livestockBagWeightKg)
        const poultryInput = poultryRate.quantityKg
        const livestockInput = livestockRate.quantityKg
        const parsed = parseFeedType(feedType)

        let poultryDailyConsumption = 0;
        let livestockDailyConsumption = 0;
        
                if(animalType === 'broiler' || animalType === 'layer'){
                        const allPoultryBatches = await Poultry.find({type:animalType,status: { $ne: 'sold' } })

                         // Prefer counting only birds that are in the same feed stage as this feed (Starter/Grower/Finisher)
                         const targetStage = parsed.feedCategory // may be 'Starter','Grower','Finisher' or null

                         let stageBatches = allPoultryBatches
                         if (targetStage) {
                             stageBatches = allPoultryBatches.filter(batch => {
                                // i will use purchagedate only
                                 const birthDate = batch.purchaseDate || new Date()
                                 const { ageInDays } = calculateAge(birthDate)
                                 const batchStage = getFeedStageFromStartingStage(ageInDays, batch.type, batch.startingStage)
                                 return (batchStage || '').toLowerCase() === (targetStage || '').toLowerCase()
                             })
                         }

                         const totalBirdsInStage = stageBatches.reduce((sum, batch) => sum + (Number(batch.quantity) || 0), 0)

              if (totalBirdsInStage > 0 && poultryInput > 0) {
                // Only calculate if there are birds in this stage AND input is provided
                poultryDailyConsumption = poultryInput / totalBirdsInStage
                logger.info('Poultry stage consumption computed.', {
                    targetStage,
                    totalBirdsInStage,
                    poultryDailyConsumption,
                })
              } else {
                //  No birds in target stage or no input provided — save feed as 0 consumption
                poultryDailyConsumption = 0
                logger.warn('Poultry stage feed calculation skipped or produced zero consumption.', {
                    targetStage,
                    totalBirdsInStage,
                    poultryInput,
                })
              }

        }else if (animalType === 'cow' || animalType === 'ram' || animalType === 'goat' || 
           animalType === 'sheep' || animalType === 'cattle' || animalType === 'horse') {

    const allLivestock = await LiveStock.find({ 
        type: animalType, 
        status: { $ne: 'sold' } 
    })

    const targetStage = parsed.feedCategory  // ✅ this is the STRING to compare against

    let stageLivestock = allLivestock  // default to all if no stage filter

    // ✅ Filter by feed stage if feedCategory exists
    if (targetStage) {
        stageLivestock = allLivestock.filter(animal => {
            const birthDate = animal.birthDay || animal.purchaseDate || new Date()
            const { ageInDays } = calculateAge(birthDate)
            const liveStage = getFeedStageFromStartingStage(ageInDays, animal.type, animal.startingStage)
            // ✅ compare liveStage string against targetStage string — NOT against the array
            return (liveStage || '').toLowerCase() === (targetStage || '').toLowerCase()
        })
    }

    // ✅ Each livestock doc = 1 animal so use .length not .reduce on quantity
    const totalLiveInStage = stageLivestock.length

    if (totalLiveInStage > 0 && livestockInput > 0) {
        livestockDailyConsumption = livestockInput / totalLiveInStage
        logger.info('Livestock stage consumption computed.', {
            targetStage,
            totalLiveInStage,
            livestockDailyConsumption,
        })
    } else {
        livestockDailyConsumption = 0
        logger.warn('Livestock stage feed calculation skipped or produced zero consumption.', {
            targetStage,
            totalLiveInStage,
            livestockInput,
        })
    }
}
        
        const totalDailyConsumption = (poultryDailyConsumption || 0) + (livestockDailyConsumption || 0)
        const totalCost = Number(cost)
        const feedPricePerkg = calculateFeedPricePerKg(totalCost, qtn);
        // const consumption = (poultryDailyConsumption * qtn) + (livestockDailyConsumption * qtn)
        const savedAnimalType = parsed.animalType || animalType
        const savedPoultryType = parsed.poultryType || (['broiler', 'layer'].includes(savedAnimalType) ? savedAnimalType : null)

        const newFeed = new Feed({
            feedType,
            animalType: savedAnimalType,
            poultryType: savedPoultryType,
            feedCategory: parsed.feedCategory,
            quantity: qtn,
            ...normalizedQuantity,
            cost,
            purchaseDate,
            supplier,
            consumption: 0,
            poultryDailyConsumption: Number(poultryDailyConsumption || 0),
            livestockDailyConsumption: Number(livestockDailyConsumption || 0),
            totalPoultryFeedConsumedPerday: poultryRate.quantityKg,
            totalPoultryFeedConsumedPerdayEntered: poultryRate.quantityEntered,
            poultryFeedUnit: poultryRate.unit,
            poultryBagWeightKg: poultryRate.bagWeightKg,
            totalLivestockFeedConsumedPerday: livestockRate.quantityKg,
            totalLivestockFeedConsumedPerdayEntered: livestockRate.quantityEntered,
            livestockFeedUnit: livestockRate.unit,
            livestockBagWeightKg: livestockRate.bagWeightKg,
            lastConsumptionUpdate: new Date(),
            feedPricePerkg,
            totalDailyConsumption,
            feedName,
        })
        await newFeed.save()
        savedFeed = newFeed
        await recalculateFeedDependents([newFeed], req.farmModels)
        recalculationCompleted = true

        if (qtn <= LOW_FEED_THRESHOLD && req.user?.email) {
            await sendNotification(req.user.email, 'LOW_FEED_ALERT', {
                userName: req.user.name || 'User',
                feedType: feedName || feedType,
                currentQty: qtn,
                minThreshold: LOW_FEED_THRESHOLD
            })
        }

        res.status(201).json({success:true,message:"Feed Added Successfully"})
    } catch (error) {
        if (savedFeed && !recalculationCompleted) {
            try {
                await Feed.findByIdAndDelete(savedFeed._id)
                await recalculateFeedDependents([savedFeed], req.farmModels)
            } catch (rollbackError) {
                logger.error('Failed to roll back feed creation after recalculation failure.', {
                    feedId: savedFeed._id,
                    error: rollbackError.message,
                })
            }
        }
        logger.error('Failed to add feed.', {
            error: error.message,
            stack: error.stack,
        })
        res.status(500).json({success:false,message:error.message})
    }
}

exports.getFeed = async (req, res) => {
    const { Feed } = req.farmModels

    try {
        const feeds = await Feed.find()
        const updatedFeeds = feeds.length > 0 ? await Promise.all(feeds.map(feed => syncFeedConsumption(feed, req.farmModels))) : []
        const responseFeeds = updatedFeeds.map(feed => {
            const feedObject = feed.toObject ? feed.toObject() : feed
            return {
                ...feedObject,
                poultryDailyConsumed: feedObject.poultryDailyConsumption,
                livestockDailyConsumed: feedObject.livestockDailyConsumption,
            }
        })

        res.status(200).json({ success: true, message: 'Feeds fetched successfully', data: responseFeeds })
    } catch (error) {
        logger.error('Failed to fetch feeds.', {
            error: error.message,
            stack: error.stack,
        })
        res.status(500).json({ message: error.message })
    }
}

exports.getById = async (req, res) => {
    const { Feed } = req.farmModels
    const id = req.params.id

    try {
        const feed = await Feed.findById(id)
        if (!feed) {
            return res.status(404).json({ success: false, message: "Feed not found..." })
        }

        const updatedFeed = await syncFeedConsumption(feed, req.farmModels)
        const feedObject = updatedFeed.toObject ? updatedFeed.toObject() : updatedFeed

        res.status(200).json({
            success: true,
            message: 'feed fetch successful',
            data: {
                ...feedObject,
                poultryDailyConsumed: feedObject.poultryDailyConsumption,
                livestockDailyConsumed: feedObject.livestockDailyConsumption,
            },
        })
    } catch (error) {
        logger.error('Failed to fetch feed by id.', {
            error: error.message,
            stack: error.stack,
        })
        res.status(500).json({ success: false, message: error.message })
    }
}

/**
 * Normalizes a date-like input into a valid Date instance.
 *
 * @param {unknown} value - The incoming date value.
 * @returns {Date} A valid Date instance.
 */
//     const id = req.params.id
//     try {
//         const existingFeed = await Feed.findById(id)
//         if(!existingFeed){
//             return  res.status(404).json({success:false,message:"Feed not found..."})
//         }

//         const parsed = parseFeedType(req.body.feedType || existingFeed.feedType)
//         const updatedData = {
//             ...req.body,
//         animalType: parsed.animalType,
//         }
//         const updatedFeed = await Feed.findOneAndUpdate({ _id: id, farmId: req.user.farmId }, updatedData, { returnDocument:'after' })
//         if(!updatedFeed){
//             return res.status(404).json({success:false,message:"Feed not found or not authorized..."})
//         }
//         const currentFeed = await updateFeedConsumption(updatedFeed)
//         await recalculatePoultry(currentFeed)
//         await recalculateLivestock(currentFeed)
//         const typeToQuery = currentFeed.poultryType || parseFeedType(currentFeed.feedType).poultryType
//         const updatedPoultry = await Poultry.find({ type: typeToQuery })
//         res.status(200).json({ success:true,data:updatedPoultry, message:"Feed update successful..." })
        
//     } catch (error) {
//          console.log(error.message)
//         res.status(500).json({success:false,message:error.message})
//     }
// }

    // ✅ updateFeedConsumption handles recalculation internally — remove the duplicate calls
exports.edit = async (req, res) => {
    const { Feed, Poultry } = req.farmModels
    const id = req.params.id
    let previousFeed
    let updatedFeed
    let recalculationCompleted = false
    try {
        const existingFeed = await Feed.findOne({ _id: id })
        if (!existingFeed) {
            return res.status(404).json({ success: false, message: "Feed not found..." })
        }
        previousFeed = existingFeed.toObject ? existingFeed.toObject() : { ...existingFeed }

        const parsed = parseFeedType(req.body.feedType || existingFeed.feedType)
        const normalizedQuantity = normalizeFeedQuantity({
            quantity: req.body.quantity,
            unit: req.body.unit || existingFeed.unit || 'kg',
            bagWeightKg: req.body.bagWeightKg ?? existingFeed.bagWeightKg,
        })
        const poultryRate = normalizeDailyFeedInput(
            req.body.totalPoultryFeedConsumedPerday ?? existingFeed.totalPoultryFeedConsumedPerdayEntered ?? existingFeed.totalPoultryFeedConsumedPerday,
            req.body.poultryFeedUnit || existingFeed.poultryFeedUnit || 'kg',
            req.body.poultryBagWeightKg ?? existingFeed.poultryBagWeightKg
        )
        const livestockRate = normalizeDailyFeedInput(
            req.body.totalLivestockFeedConsumedPerday ?? existingFeed.totalLivestockFeedConsumedPerdayEntered ?? existingFeed.totalLivestockFeedConsumedPerday,
            req.body.livestockFeedUnit || existingFeed.livestockFeedUnit || 'kg',
            req.body.livestockBagWeightKg ?? existingFeed.livestockBagWeightKg
        )
        const updatedCost = Number(req.body.cost ?? existingFeed.cost)
        const updatedData = {
            ...req.body,
            quantity: normalizedQuantity.quantityKg,
            ...normalizedQuantity,
            feedPricePerkg: calculateFeedPricePerKg(updatedCost, normalizedQuantity.quantityKg),
            totalPoultryFeedConsumedPerday: poultryRate.quantityKg,
            totalPoultryFeedConsumedPerdayEntered: poultryRate.quantityEntered,
            poultryFeedUnit: poultryRate.unit,
            poultryBagWeightKg: poultryRate.bagWeightKg,
            totalLivestockFeedConsumedPerday: livestockRate.quantityKg,
            totalLivestockFeedConsumedPerdayEntered: livestockRate.quantityEntered,
            livestockFeedUnit: livestockRate.unit,
            livestockBagWeightKg: livestockRate.bagWeightKg,
            animalType: parsed.animalType,
            poultryType: parsed.poultryType,
            feedCategory: parsed.feedCategory,
        }

        updatedFeed = await Feed.findOneAndUpdate(
            { _id: id },
            updatedData,
            { returnDocument: 'after' }
        )
        if (!updatedFeed) {
            return res.status(404).json({ success: false, message: "Feed not found or not authorized..." })
        }

        await updateFeedConsumption(updatedFeed, req.farmModels)
        await recalculateFeedDependents([previousFeed, updatedFeed], req.farmModels)
        recalculationCompleted = true

        const typeToQuery = updatedFeed.animalType || parsed.animalType
        const isPoultryFeed = ['broiler', 'layer'].includes(String(typeToQuery || '').toLowerCase())
        const AnimalModel = isPoultryFeed ? Poultry : req.farmModels.LiveStock
        const updatedAnimals = await AnimalModel.find({ type: typeToQuery })

        res.status(200).json({ success: true, data: updatedAnimals, message: "Feed update successful..." })

    } catch (error) {
        if (previousFeed && updatedFeed && !recalculationCompleted) {
            try {
                const { _id, __v, ...restoreFields } = previousFeed
                await Feed.findByIdAndUpdate(_id, { $set: restoreFields }, { returnDocument: 'after' })
                await recalculateFeedDependents([updatedFeed, previousFeed], req.farmModels)
            } catch (rollbackError) {
                logger.error('Failed to restore feed after recalculation failure.', {
                    feedId: previousFeed._id,
                    error: rollbackError.message,
                    stack: rollbackError.stack,
                })
            }
        }
        logger.error('Failed to update feed.', {
            error: error.message,
            stack: error.stack,
        })
        res.status(500).json({ success: false, message: error.message })
    }
}

exports.del = async(req,res)=>{
    const { Feed, Poultry, LiveStock } = req.farmModels
    const id = req.params.id
    let deletedFeed
    let didDelete = false
    let recalculationCompleted = false
    try {
        const feed = await Feed.findOne({ _id: id })
        if(!feed){
            return  res.status(404).json({success:false,message:"Feed not found..."})
        }
        deletedFeed = feed.toObject ? feed.toObject() : { ...feed }
        await Feed.findOneAndDelete({ _id: id })
        didDelete = true
        await recalculateFeedDependents([deletedFeed], req.farmModels)
        recalculationCompleted = true

    //  const animalType = feed.animalType || feed.poultryType || parseFeedType(feed.feedType).animalType
    //     if (animalType) {
    //       await Poultry.updateMany(
    //         { type: animalType, status: { $ne: 'sold' } },
    //         {
    //           $set: {
    //             totalFeedConsumed: 0,
    //             // poultryConsumePerkg: 0,
    //             feedCostPerPoultry: 0,
    //             totalFeedCost: 0,
    //             // costPerPoultry: 0,
    //           },
    //         }
    //       )
    //       await LiveStock.updateMany(
    //         { type: animalType, status: { $ne: 'sold' } },
    //         {
    //           $set: {
    //             totalFeedConsumed: 0,
    //             livestockFeedConsumed: 0,
    //             costPrice: 0,
    //             // totalCost: 0,
    //           },
    //         }
    //       )
    //     }

        res.status(200).json({ success:true,message:"feed deleted successfully"})
    } catch (error) {
        if (deletedFeed && didDelete && !recalculationCompleted) {
            try {
                await Feed.create(deletedFeed)
                await recalculateFeedDependents([deletedFeed], req.farmModels)
            } catch (rollbackError) {
                logger.error('Failed to restore feed after delete recalculation failure.', {
                    feedId: deletedFeed._id,
                    error: rollbackError.message,
                    stack: rollbackError.stack,
                })
            }
        }
        logger.error('Failed to delete feed.', {
            error: error.message,
            stack: error.stack,
        })
        res.status(500).json({success:false,message:error.message})
    }
}

exports.recalculatePoultry = recalculatePoultry
exports.recalculateLivestock = recalculateLivestock

// Recalculate all feeds that match an animal type and (optional) feed stage.
// This is used by livestock create/edit/delete flows so feed rates stay in sync
// with the current population of animals of that type/stage.
exports.recalculateLivestockForTypeAndStage = async (animalType, feedCategory, farmModels) => {
    const { Feed, LiveStock } = farmModels
    try {
        if (!animalType) return

        // find feeds that are for this animalType and optionally the feedCategory
        const feedQuery = { animalType: animalType }
        if (feedCategory) feedQuery.feedCategory = feedCategory
        const feeds = await Feed.find(feedQuery)
        if (!feeds || feeds.length === 0) return

        // fetch all live animals of this type
        const animals = await LiveStock.find({ type: animalType, status: { $ne: 'sold' } })

        // compute counts used for allocation
        const stageAnimals = feedCategory ? getStageRecords(animals, feedCategory) : animals
        const stageCount = stageAnimals.reduce((s, a) => s + (Number(a.quantity) || 0), 0)
        const totalCount = animals.reduce((s, a) => s + (Number(a.quantity) || 0), 0)
        const effectiveCount = stageCount > 0 ? stageCount : totalCount

        // update each matching feed and then recalculate livestock assignments
        for (const feed of feeds) {
            const totalLivestockFeedPerday = Number(feed.totalLivestockFeedConsumedPerday) || 0
            const normalizedTotal = totalLivestockFeedPerday > 0 ? totalLivestockFeedPerday : (Number(feed.livestockDailyConsumption) || 0) * Math.max(effectiveCount, 0)
            const newRate = effectiveCount > 0 ? normalizedTotal / effectiveCount : 0

            const updatedFeed = await Feed.findByIdAndUpdate(
                feed._id,
                {
                    livestockDailyConsumption: newRate,
                    totalLivestockFeedConsumedPerday: normalizedTotal,
                    totalDailyConsumption: newRate + (Number(feed.poultryDailyConsumption) || 0),
                },
                { returnDocument: 'after' }
            )

            // Update livestock documents that rely on this feed so per-animal rates are consistent
            try {
                await recalculateLivestock(updatedFeed, farmModels)
            } catch (err) {
                logger.error('Failed to recalculate livestock after feed update.', {
                    feedId: feed?._id,
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