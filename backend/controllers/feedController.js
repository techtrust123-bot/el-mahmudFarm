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

exports.addFeed = async(req,res)=>{
    const { Feed, Poultry } = req.farmModels
    const {feedType,quantity,cost,purchaseDate,supplier,feedName,totalPoultryFeedConsumedPerday,totalLivestockFeedConsumedPerday,animalType} = req.body
    if(!feedType || !quantity || !cost || !purchaseDate || !supplier || !feedName || !animalType){
        return res.status(400).json({message:"Input fields are required..."})
    }
    try {
        const qtn = Number(quantity)
        let poultryDailyConsumption = 0;
        let livestockDailyConsumption = 0;
        if(qtn <= 0){
            return res.status(400).json({success:false,message:"Quantity must be greater than zero..."})
            
        }
        
        const poultryInput = Number(totalPoultryFeedConsumedPerday || 0);
        const livestockInput = Number(totalLivestockFeedConsumedPerday || 0);
        
        if(animalType === 'broiler' || animalType === 'layer'){
            const allPoultryBatches = await Poultry.find({type:animalType,status: { $ne: 'sold' } })
             const totalBirds = allPoultryBatches.reduce((sum, batch) => {
                return sum + (Number(batch.quantity) || 0)
            }, 0)

              if (totalBirds > 0) {
                //  Per bird daily consumption
                poultryDailyConsumption = poultryInput / totalBirds
                console.log(`Total birds: ${totalBirds} | perBird: ${poultryDailyConsumption}`)
            } else {
                //  No poultry yet — save feed anyway, recalculate when poultry is added
                poultryDailyConsumption = 0
                console.log('No poultry found — feed saved, will recalculate when poultry is added')
            }

        //    if (poultry && poultry.quantity > 0) {
        //         poultryDailyConsumption = poultryInput / Number(poultry.quantity)
        //     } else {
        //         // No poultry yet — store the total input, calculate per-bird later when poultry is added
        //         poultryDailyConsumption = 0
        //     }
            // poultryDailyConsumption = poultryInput / (poultry.quantity || 0);
        }else {
            //  Livestock — find all animals of this type
            const allLivestock = await LiveStock.find({ 
                type: animalType, 
                status: { $ne: 'sold' } 
            })

            const totalAnimals = allLivestock.length  // each doc = 1 animal

            if (totalAnimals > 0) {
                livestockDailyConsumption = livestockInput / totalAnimals
                console.log(`Total animals: ${totalAnimals} | perAnimal: ${livestockDailyConsumption}`)
            } else {
                livestockDailyConsumption = 0
                console.log('No livestock found — feed saved, will recalculate when livestock is added')
            }
        }
            await calculateFeedForPoultry({ poultryDailyConsumption,},)
        // await recalculatePoultry({ feedType, poultryDailyConsumption }, req.farmModels)
        // await recalculateLivestock({ feedType, livestockDailyConsumption }, req.farmModels)
        const totalDailyConsumption = (poultryDailyConsumption || 0) + (livestockDailyConsumption || 0)
        const totalCost = Number(cost)
        const feedPricePerkg = totalCost / qtn;
        const parsed = parseFeedType(feedType)
        
       
        const newFeed = new Feed({
            feedType,
            animalType: parsed.animalType,
            poultryType: parsed.poultryType,
            feedCategory: parsed.feedCategory,
            quantity,
            cost,
            purchaseDate,
            supplier,
            consumption: 0,
            poultryDailyConsumption: Number(poultryDailyConsumption || 0),
            livestockDailyConsumption: Number(livestockDailyConsumption || 0),
            totalPoultryFeedConsumedPerday: Number(totalPoultryFeedConsumedPerday),
            totalLivestockFeedConsumedPerday: Number(totalLivestockFeedConsumedPerday),
            lastConsumptionUpdate: new Date(purchaseDate),
            feedPricePerkg,
            totalDailyConsumption,
            feedName,
        })
        await newFeed.save()
        await recalculatePoultry(newFeed, req.farmModels)
        await recalculateLivestock(newFeed, req.farmModels)
        
            
        res.status(201).json({success:true,message:"Feed Added Successfully"})
    } catch (error) {
        console.log(error.message)
        res.status(500).json({success:false,message:error.message})
    }
}

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const updateFeedConsumption = async (feed, farmModels) => {
    const { Feed, Poultry, LiveStock } = farmModels
    const now = new Date()
    const lastUpdate = feed.lastConsumptionUpdate ? new Date(feed.lastConsumptionUpdate) : feed.purchaseDate ? new Date(feed.purchaseDate) : startOfDay(new Date())
    const startToday = startOfDay(now)
    const startLast = startOfDay(lastUpdate)
    const diffDays = Math.floor((startToday - startLast) / (1000 * 60 * 60 * 24))
    if (diffDays <= 0) return feed

    const averageDailyConsumption = Number(feed.averageDailyConsumption) || 0
    if (averageDailyConsumption <= 0) {
        const updatedFeed = await Feed.findByIdAndUpdate(
            feed._id,
            { lastConsumptionUpdate: startToday },
            { returnDocument: 'after' }
        )
        await recalculatePoultry(updatedFeed, farmModels)
        await recalculateLivestock(updatedFeed, farmModels)
        return updatedFeed
    }

    // const animalType = feed.poultryType || feed.animalType || parseFeedType(feed.feedType).animalType
    const parsed = parseFeedType(feed.feedType)
    const poultryQuery = { status: { $ne: 'sold' } }
    const livestockQuery = { status: { $ne: 'sold' } }

    if (parsed.poultryType) {
    poultryQuery.type = parsed.poultryType  // only query poultry if it's a poultry feed
    } else {
    poultryQuery.type = null  // will return empty — no poultry for livestock feed
    }

    if (parsed.animalType && !parsed.poultryType) {
    livestockQuery.type = parsed.animalType  // only query livestock if it's a livestock feed
    } else {
    livestockQuery.type = null
    }

    // if (parsed.animalType && ['broiler', 'layer'].includes(parsed.animalType)) poultryQuery.type = parsed.animalType
    // if (parsed.animalType && !['broiler', 'layer'].includes(parsed.animalType)) livestockQuery.type = parsed.animalType

    const [poultryBatches, liveStockAnimals] = await Promise.all([
        Poultry.find(poultryQuery),
        LiveStock.find(livestockQuery),
    ])

    const totalPoultryCount = poultryBatches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0)
    const totalLivestockCount = liveStockAnimals.length

    const totalAnimalCount = totalPoultryCount + totalLivestockCount
    // const totalDailyRequired = totalAnimalCount * averageDailyConsumption
    const poultryDailyRate = Number(feed.averageDailyConsumptionPoultry) || Number(feed.averageDailyConsumption) || 0
    const livestockDailyRate = Number(feed.averageDailyConsumptionLivestock) || Number(feed.averageDailyConsumption) || 0

    const available = Number(feed.quantity) || 0
    const totalPoultryRequired = totalPoultryCount * poultryDailyRate * diffDays
    const totalLivestockRequired = totalLivestockCount * livestockDailyRate * diffDays
    const totalDecrease = totalPoultryRequired + totalLivestockRequired
    // const totalDecrease = totalDailyRequired * diffDays
    const actualDecrease = Math.min(totalDecrease, available)
    const updatedQuantity = Math.max(available - actualDecrease, 0)
    const updatedConsumption = Number(feed.consumption || 0) + actualDecrease

    const updatedFeed = await Feed.findByIdAndUpdate(
        feed._id,
        {
            quantity: updatedQuantity,
            consumption: updatedConsumption,
            lastConsumptionUpdate: startToday,
        },
        { returnDocument: 'after' }
    )

    await recalculatePoultry(updatedFeed, farmModels)
    await recalculateLivestock(updatedFeed, farmModels)

    return updatedFeed
}

exports.getFeed = async(req,res)=>{
    const { Feed } = req.farmModels
    try {
        const feeds = await Feed.find()
        if(!feeds || feeds.length === 0){
            return res.status(404).json({success:false,message:"Feed not found..."})
        }

        const updatedFeeds = await Promise.all(feeds.map(feed => updateFeedConsumption(feed, req.farmModels)))
        res.status(200).json({success:true,message:updatedFeeds,data:updatedFeeds})
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
        res.status(200).json({success:true,message:'feed fetch successful',data:updatedFeed})
    } catch (error) {
        console.log(error.message)
        res.status(500).json({success:false,message:error.message})
    }
}
const recalculatePoultry = async (feed, farmModels) => {
  const { Poultry } = farmModels
  try {
    const animalType = feed.animalType || feed.poultryType || parseFeedType(feed.feedType).animalType
    if (!animalType) return

    const birds = await Poultry.find({ type: animalType, status: { $ne: 'sold' } })
    if (!birds || birds.length === 0) return

    const operations = birds.map((bird) => {
      const batch = calculateBatchConsumption(feed, bird)
      const birthDate = bird.birthDay || bird.purchaseDate || new Date()
      const { ageInDays, ageInWeeks } = calculateAge(birthDate)
      const currentFeedStage = getFeedStage(ageInDays, bird.type)

      return {
        updateOne: {
          filter: { _id: bird._id },
          update: {
            ageInDays,
            ageInWeeks,
            currentFeedStage,
            currentFeedType: feed.feedType,
            currentFeedName: feed.feedName,
            feedStage: currentFeedStage,
            totalFeedConsumed: batch.totalFeedConsumed,
            poultryConsumePerBird: batch.poultryConsumePerBird,
            poultryConsumePerkg: batch.poultryConsumePerBird,
            feedCostPerPoultry: batch.feedCostPerPoultry,
            totalFeedCost: batch.totalFeedCost,
            totalCost: batch.totalCost,
            costPerPoultry: batch.costPerPoultry,
          },
        },
      }
    }).filter(Boolean)

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
        const livestockType = feed.animalType || feed.poultryType || parseFeedType(feed.feedType).animalType
        if (!livestockType) return

        const animals = await LiveStock.find({ type: livestockType, status: { $ne: 'sold' } })
        if (!animals || animals.length === 0) return

        const operations = animals.map((animal) => {
            const batch = calculateLivestockConsumption(feed, animal)
            return {
                updateOne: {
                    filter: { _id: animal._id },
                    update: {
                        totalFeedConsumed: batch.totalFeedConsumed,
                        livestockFeedConsumed: batch.livestockFeedConsumedPerAnimal,
                        costPrice: batch.costPrice,
                        totalCost: batch.totalCost,
                    },
                },
            }
        }).filter(Boolean)

        if (operations.length > 0) {
            await LiveStock.bulkWrite(operations)
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