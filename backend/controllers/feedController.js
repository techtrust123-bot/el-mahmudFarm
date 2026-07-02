const Feed = require("../models/feed")
const Poultry = require("../models/poultry")
const LiveStock = require('../models/liveStock')
const {
  getFeedStage,
  calculateAge,
  getFeedForStage,
  parseFeedType,
} = require('../utils/feedStageHelper')
const {
  calculateBatchConsumption,
  calculateLivestockConsumption,
  calculateFeedForPoultry,
} = require('../utils/feedCalculator')
const { sendNotification } = require('../services/emailService')

const LOW_FEED_THRESHOLD = Number(process.env.LOW_FEED_THRESHOLD) || 20

exports.addFeed = async(req,res)=>{
    const { Feed, Poultry,LiveStock } = req.farmModels
    const {feedType,feedCategory,quantity,cost,purchaseDate,supplier,feedName,totalPoultryFeedConsumedPerday,totalLivestockFeedConsumedPerday,animalType} = req.body
    if(!feedType || !quantity || !cost || !purchaseDate || !supplier || !feedName || !animalType){
        return res.status(400).json({message:"Input fields are required..."})
    }
    try {
        const qtn = Number(quantity)
        if(qtn <= 0){
            return res.status(400).json({success:false,message:"Quantity must be greater than zero..."})
            
        }
        
        const poultryInput = Number(totalPoultryFeedConsumedPerday || 0);
        const livestockInput = Number(totalLivestockFeedConsumedPerday || 0);
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
                                 const birthDate = batch.birthDay || batch.purchaseDate || new Date()
                                 const { ageInDays } = calculateAge(birthDate)
                                 const batchStage = getFeedStage(ageInDays, batch.type)
                                 return (batchStage || '').toLowerCase() === (targetStage || '').toLowerCase()
                             })
                         }

                         const totalBirdsInStage = stageBatches.reduce((sum, batch) => sum + (Number(batch.quantity) || 0), 0)

              if (totalBirdsInStage > 0 && poultryInput > 0) {
                // Only calculate if there are birds in this stage AND input is provided
                poultryDailyConsumption = poultryInput / totalBirdsInStage
                console.log(`Total birds in stage "${targetStage}": ${totalBirdsInStage} | perBird: ${poultryDailyConsumption}`)
              } else {
                //  No birds in target stage or no input provided — save feed as 0 consumption
                poultryDailyConsumption = 0
                console.log(`Feed for stage "${targetStage}": no birds in stage (${totalBirdsInStage}) or no input (${poultryInput}) — poultryDailyConsumption = 0`)
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
            const liveStage = getFeedStage(ageInDays, animal.type)
            // ✅ compare liveStage string against targetStage string — NOT against the array
            return (liveStage || '').toLowerCase() === (targetStage || '').toLowerCase()
        })
    }

    // ✅ Each livestock doc = 1 animal so use .length not .reduce on quantity
    const totalLiveInStage = stageLivestock.length

    if (totalLiveInStage > 0 && livestockInput > 0) {
        livestockDailyConsumption = livestockInput / totalLiveInStage
        console.log(`Total livestock in stage "${targetStage}": ${totalLiveInStage} | perAnimal: ${livestockDailyConsumption}`)
    } else {
        livestockDailyConsumption = 0
        console.log(`No livestock in stage "${targetStage}" (${totalLiveInStage}) or no input (${livestockInput}) — livestockDailyConsumption = 0`)
    }
}
        
        const totalDailyConsumption = (poultryDailyConsumption || 0) + (livestockDailyConsumption || 0)
        const totalCost = Number(cost)
        const feedPricePerkg = totalCost / qtn;
        // const consumption = (poultryDailyConsumption * qtn) + (livestockDailyConsumption * qtn)
        const savedAnimalType = parsed.animalType || animalType
        const savedPoultryType = parsed.poultryType || (['broiler', 'layer'].includes(savedAnimalType) ? savedAnimalType : null)

        const newFeed = new Feed({
            feedType,
            animalType: savedAnimalType,
            poultryType: savedPoultryType,
            feedCategory: parsed.feedCategory,
            quantity,
            cost,
            purchaseDate,
            supplier,
            consumption: 0,
            poultryDailyConsumption: Number(poultryDailyConsumption || 0),
            livestockDailyConsumption: Number(livestockDailyConsumption || 0),
            totalPoultryFeedConsumedPerday: Number(totalPoultryFeedConsumedPerday || 0),
            totalLivestockFeedConsumedPerday: Number(totalLivestockFeedConsumedPerday || 0),
            lastConsumptionUpdate: new Date(purchaseDate),
            feedPricePerkg,
            totalDailyConsumption,
            feedName,
        })
        await newFeed.save()
        await recalculatePoultry(newFeed, req.farmModels)
        await recalculateLivestock(newFeed, req.farmModels)

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
        console.log(error.message)
        res.status(500).json({success:false,message:error.message})
    }
}

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const getDaysBetween = (startDate, endDate) => {
    const start = startOfDay(new Date(startDate || new Date()))
    const end = startOfDay(new Date(endDate || new Date()))
    return Math.max(Math.floor((end - start) / (1000 * 60 * 60 * 24)), 0)
}

const getStageRecords = (records, stage) => {
    if (!stage) return records
    return records.filter((item) => {
        const birthDate = item.birthDay || item.purchaseDate || new Date()
        const { ageInDays } = calculateAge(birthDate)
        const batchStage = getFeedStage(ageInDays, item.type)
        return (batchStage || '').toLowerCase() === (stage || '').toLowerCase()
    })
}

const updateFeedConsumption = async (feed, farmModels) => {
    const { Feed, Poultry, LiveStock } = farmModels
    const now = new Date()
    const lastUpdate = feed.lastConsumptionUpdate ? new Date(feed.lastConsumptionUpdate) : feed.purchaseDate ? new Date(feed.purchaseDate) : startOfDay(new Date())
    const startToday = startOfDay(now)
    const startLast = startOfDay(lastUpdate)
    const diffDays = Math.floor((startToday - startLast) / (1000 * 60 * 60 * 24))
    if (diffDays <= 0) return feed

    const parsed = parseFeedType(feed.feedType)
    const poultryQuery = { status: { $ne: 'sold' } }
    const livestockQuery = { status: { $ne: 'sold' } }

    if (parsed.poultryType) {
        poultryQuery.type = parsed.poultryType
    } else if (feed.animalType && ['broiler', 'layer'].includes(feed.animalType)) {
        poultryQuery.type = feed.animalType
    } else {
        poultryQuery.type = null
    }

    if (parsed.animalType && !parsed.poultryType) {
        livestockQuery.type = parsed.animalType
    } else if (feed.animalType && !['broiler', 'layer'].includes(feed.animalType)) {
        livestockQuery.type = feed.animalType
    } else {
        livestockQuery.type = null
    }

    const [poultryBatches, liveStockAnimals] = await Promise.all([
        poultryQuery.type ? Poultry.find(poultryQuery) : [],
        livestockQuery.type ? LiveStock.find(livestockQuery) : [],
    ])

    const stageBirds = getStageRecords(poultryBatches, feed.feedCategory)
    const totalPoultryCount = stageBirds.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0)
    const stageAnimals = getStageRecords(liveStockAnimals, feed.feedCategory)
    const totalLivestockCount = stageAnimals.reduce((sum, a) => sum + (Number(a.quantity) || 0), 0)

    const totalPoultryFeedPerday = Number(feed.totalPoultryFeedConsumedPerday) || 0
    const totalLivestockFeedPerday = Number(feed.totalLivestockFeedConsumedPerday) || 0

    const poultryDailyRate = totalPoultryCount > 0 ? totalPoultryFeedPerday / totalPoultryCount : 0
    const livestockDailyRate = totalLivestockCount > 0 ? totalLivestockFeedPerday / totalLivestockCount : 0

    const available = Number(feed.quantity) || 0
    const totalPoultryRequired = totalPoultryCount * poultryDailyRate * diffDays
    const totalLivestockRequired = totalLivestockCount * livestockDailyRate * diffDays
    const totalDecrease = totalPoultryRequired + totalLivestockRequired
    const actualDecrease = Math.min(totalDecrease, available)
    const updatedQuantity = Math.max(available - actualDecrease, 0)
    const updatedConsumption = Number(feed.consumption || 0) + actualDecrease

    const updatedFeed = await Feed.findByIdAndUpdate(
        feed._id,
        {
            quantity: updatedQuantity,
            consumption: updatedConsumption,
            lastConsumptionUpdate: startToday,
            poultryDailyConsumption: poultryDailyRate,
            livestockDailyConsumption: livestockDailyRate,
            totalDailyConsumption: poultryDailyRate + livestockDailyRate,
        },
        { returnDocument: 'after' }
    )

    await recalculatePoultry(updatedFeed, farmModels)
    await recalculateLivestock(updatedFeed, farmModels)

    return updatedFeed
}

const mapFeedResponse = (feed) => {
    const feedObject = feed.toObject ? feed.toObject() : feed
    return {
        ...feedObject,
        poultryDailyConsumed: feedObject.poultryDailyConsumption,
        livestockDailyConsumed: feedObject.livestockDailyConsumption,
    }
}

exports.getFeed = async(req,res)=>{
    const { Feed } = req.farmModels
    try {
        const feeds = await Feed.find()
        const updatedFeeds = feeds.length > 0 ? await Promise.all(feeds.map(feed => updateFeedConsumption(feed, req.farmModels))) : []
        const responseFeeds = updatedFeeds.map(mapFeedResponse)
        res.status(200).json({success:true,message:'Feeds fetched successfully',data:responseFeeds})
    } catch (error) {
        console.log(error.message)
        res.status(500).json({message:error.message})
    }
}

exports.getById = async(req,res)=>{
    const { Feed } = req.farmModels
    const id = req.params.id
    try {
        const feed = await Feed.findOne({ _id: id })
        if(!feed){
         return  res.status(404).json({success:false,message:"Feed not found..."})
        }
        const updatedFeed = await updateFeedConsumption(feed, req.farmModels)
        res.status(200).json({success:true,message:'feed fetch successful',data:mapFeedResponse(updatedFeed)})
    } catch (error) {
        console.log(error.message)
        res.status(500).json({success:false,message:error.message})
    }
}
const recalculatePoultry = async (feed, farmModels) => {
  const { Poultry, Feed } = farmModels
  try {
    const animalType = feed.animalType || feed.poultryType || parseFeedType(feed.feedType).animalType
    if (!animalType) return

    const birds = await Poultry.find({ type: animalType, status: { $ne: 'sold' } })
    if (!birds || birds.length === 0) return

    const stageBirds = feed.feedCategory ? getStageRecords(birds, feed.feedCategory) : birds
    const totalBirds = stageBirds.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0)
    if (totalBirds <= 0) {
      await Feed.findByIdAndUpdate(
        feed._id,
        {
          poultryDailyConsumption: 0,
          totalDailyConsumption: (Number(feed.livestockDailyConsumption) || 0),
        },
        { returnDocument: 'after' }
      )
      return
    }

    const totalPoultryFeedPerday = Number(feed.totalPoultryFeedConsumedPerday) || 0
    const newPoultryDailyConsumption = totalPoultryFeedPerday > 0 ? totalPoultryFeedPerday / totalBirds : 0

    const updatedFeed = await Feed.findByIdAndUpdate(
      feed._id,
      {
        poultryDailyConsumption: newPoultryDailyConsumption,
        totalDailyConsumption: newPoultryDailyConsumption + (Number(feed.livestockDailyConsumption) || 0),
      },
      { returnDocument: 'after' }
    )

    console.log('Feed updated successfully')

    const operations = []
    const today = startOfDay(new Date())

    for (const bird of birds) {
      const birthDate = bird.birthDay || bird.purchaseDate || new Date()
      const { ageInDays, ageInWeeks } = calculateAge(birthDate)
      const currentFeedStage = getFeedStage(ageInDays, bird.type)

      // pick a feed that matches this bird's type and stage; fall back to the updated feed
      const feedForStage = await getFeedForStage(Feed, bird.type, currentFeedStage)
      const feedToUse = feedForStage || updatedFeed

      const defaultLastUpdate = bird.totalFeedConsumed > 0 ? today : (bird.joinDate || bird.purchaseDate || today)
      const lastFeedUpdate = bird.lastFeedUpdate ? new Date(bird.lastFeedUpdate) : defaultLastUpdate
      const daysSinceLastUpdate = getDaysBetween(lastFeedUpdate, today)
      const quantity = Math.max(Number(bird.quantity) || 0, 0)
      const dailyRate = Number(feedToUse.poultryDailyConsumption) || 0
      const pricePerKg = Number(feedToUse.feedPricePerkg) || 0

      const existingFeedConsumed = Number(bird.totalFeedConsumed) || 0
      const existingFeedCost = Number(bird.totalFeedCost) || 0
      const existingPurchasePrice = Number(bird.purchasePrice || 0)

      let nextFeedConsumed = existingFeedConsumed
      if (daysSinceLastUpdate > 0) {
        const incrementalPerBird = dailyRate * daysSinceLastUpdate
        const incrementalTotalFeed = incrementalPerBird * quantity

        nextFeedConsumed = existingFeedConsumed + incrementalTotalFeed
      }

      const perBirdConsumed = quantity > 0 ? nextFeedConsumed / quantity : 0
      const feedCostPerPoultry = perBirdConsumed * pricePerKg
      const totalFeedCost = perBirdConsumed * quantity * pricePerKg
      const totalCost = existingPurchasePrice + totalFeedCost

      const updateData = {
        ageInDays,
        ageInWeeks,
        currentFeedStage,
        currentFeedType: feedToUse.feedType,
        currentFeedName: feedToUse.feedName,
        feedStage: currentFeedStage,
        totalFeedConsumed: nextFeedConsumed,
        poultryConsumePerBird: perBirdConsumed,
        poultryConsumePerkg: perBirdConsumed,
        feedCostPerPoultry,
        totalFeedCost,
        totalCost,
        costPerPoultry: quantity > 0 ? totalCost / quantity : 0,
      }

      if (daysSinceLastUpdate > 0) {
        updateData.lastFeedUpdate = today
      }

      operations.push({
        updateOne: {
          filter: { _id: bird._id, status: { $ne: 'sold' } },
          update: updateData,
        },
      })
    }

        if (operations.length > 0) {
            await Poultry.bulkWrite(operations)
        }
  } catch (error) {
    console.log("Bulk update error:", error)
  }
};

const recalculateLivestock = async (feed, farmModels) => {
    const { LiveStock } = farmModels
    try {
        const livestockType = feed.animalType || parseFeedType(feed.feedType).animalType
        if (!livestockType) return

        const animals = await LiveStock.find({ type: livestockType, status: { $ne: 'sold' } })
        if (!animals || animals.length === 0) return

        const stageAnimals = feed.feedCategory ? getStageRecords(animals, feed.feedCategory) : animals
        const stageAnimalCount = stageAnimals.reduce((sum, animal) => {
            return sum + (Number(animal.quantity) || 0)
        }, 0)
        const totalAnimalCount = animals.reduce((sum, animal) => {
            return sum + (Number(animal.quantity) || 0)
        }, 0)
        const totalAnimals = stageAnimalCount > 0 ? stageAnimalCount : totalAnimalCount
        if (totalAnimals <= 0) {
          await Feed.findByIdAndUpdate(
            feed._id,
            {
              livestockDailyConsumption: 0,
              totalDailyConsumption: (Number(feed.poultryDailyConsumption) || 0)
            },
            { returnDocument: 'after' }
          )
          return
        }

        const totalLivestockFeedPerday = Number(feed.totalLivestockFeedConsumedPerday) || 0
        const newLivestockDailyConsumption = totalLivestockFeedPerday / totalAnimals
        const updatedFeed = await Feed.findByIdAndUpdate(
            feed._id,
            {
                livestockDailyConsumption: newLivestockDailyConsumption,
                totalDailyConsumption: newLivestockDailyConsumption + (Number(feed.poultryDailyConsumption) || 0)
            },
            { returnDocument: 'after' }
        )

        console.log('Feed updated successfully for livestock')

        const today = startOfDay(new Date())
        const livestockToUpdate = feed.feedCategory ? stageAnimals : animals
        const operations = livestockToUpdate.map(async (animal) => {
            const birthDate = animal.birthDay || animal.purchaseDate || new Date()
            const { ageInDays } = calculateAge(birthDate)
            const currentFeedStage = getFeedStage(ageInDays, animal.type)
            const feedForStage = await getFeedForStage(Feed, animal.type, currentFeedStage)
            const feedToUse = feedForStage || updatedFeed || feed

            const defaultLastUpdate = animal.totalFeedConsumed > 0 ? today : (animal.lastFeedUpdate || animal.joinDate || animal.purchaseDate || new Date())
            const lastFeedUpdate = animal.lastFeedUpdate ? new Date(animal.lastFeedUpdate) : new Date(defaultLastUpdate)
            const daysSinceLastUpdate = getDaysBetween(lastFeedUpdate, today)
            const quantity = Math.max(Number(animal.quantity) || 0, 0)
            const dailyRate = Number(feedToUse.livestockDailyConsumption) || 0
            const pricePerKg = Number(feedToUse.feedPricePerkg) || 0

            const existingFeedConsumed = Number(animal.totalFeedConsumed) || 0
            const existingPurchasePrice = Number(animal.purchasePrice || 0)

            let nextFeedConsumed = existingFeedConsumed
            if (daysSinceLastUpdate > 0) {
                const incrementalPerAnimal = dailyRate * daysSinceLastUpdate
                const incrementalTotalFeed = incrementalPerAnimal * quantity

                nextFeedConsumed = existingFeedConsumed + incrementalTotalFeed
            }

            const perAnimalConsumed = quantity > 0 ? nextFeedConsumed / quantity : 0
            const costPrice = perAnimalConsumed * pricePerKg
            const totalFeedCost = perAnimalConsumed * quantity * pricePerKg
            const totalCost = existingPurchasePrice + totalFeedCost

            const updateData = {
                ageInDays,
                feedStage: currentFeedStage,
                currentFeedType: feedToUse.feedType,
                currentFeedName: feedToUse.feedName,
                totalFeedConsumed: nextFeedConsumed,
                livestockFeedConsumed: perAnimalConsumed,
                costPrice,
                totalCost,
            }

            if (daysSinceLastUpdate > 0) {
                updateData.lastFeedUpdate = today
            }

            return {
                updateOne: {
                    filter: { _id: animal._id, status: { $ne: 'sold' } },
                    update: updateData,
                },
            }
        }).filter(Boolean)

        if (operations.length > 0) {
            await LiveStock.bulkWrite(await Promise.all(operations))
        }
    } catch (error) {
        console.log("Bulk update error:", error);
    }
}

// exports.edit = async(req,res)=>{
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
    try {
        const existingFeed = await Feed.findOne({ _id: id })
        if (!existingFeed) {
            return res.status(404).json({ success: false, message: "Feed not found..." })
        }

        const parsed = parseFeedType(req.body.feedType || existingFeed.feedType)
        const updatedData = {
            ...req.body,
            animalType: parsed.animalType,
            poultryType: parsed.poultryType,
            feedCategory: parsed.feedCategory,
        }

        const updatedFeed = await Feed.findOneAndUpdate(
            { _id: id },
            updatedData,
            { returnDocument: 'after' }
        )
        if (!updatedFeed) {
            return res.status(404).json({ success: false, message: "Feed not found or not authorized..." })
        }

        await updateFeedConsumption(updatedFeed, req.farmModels)

        const typeToQuery = updatedFeed.poultryType || parsed.poultryType
        const updatedPoultry = await Poultry.find({ 
            type: typeToQuery 
        })

        res.status(200).json({ success: true, data: updatedPoultry, message: "Feed update successful..." })

    } catch (error) {
        console.log(error.message)
        res.status(500).json({ success: false, message: error.message })
    }
}

exports.del = async(req,res)=>{
    const { Feed, Poultry, LiveStock } = req.farmModels
    const id = req.params.id
    try {
        const feed = await Feed.findOne({ _id: id })
        if(!feed){
            return  res.status(404).json({success:false,message:"Feed not found..."})
        }
        await Feed.findOneAndDelete({ _id: id })

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
         console.log(error.message)
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
                console.log('Error recalculating livestock after feed update:', err && err.message ? err.message : err)
            }
        }
    } catch (error) {
        console.log('recalculateLivestockForTypeAndStage error:', error.message)
    }
}