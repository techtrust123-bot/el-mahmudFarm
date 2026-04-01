const Feed = require("../models/feed")
const Poultry = require("../models/poultry")
const LiveStock = require('../models/liveStock')
const {
  getFeedStage,
  calculateAge,
  getFeedForStage,
  parseFeedType,
} = require('../utils/feedStageHelper')

exports.addFeed = async(req,res)=>{
    const {feedType,quantity,cost,purchaseDate,supplier,feedName,averageDailyConsumption} = req.body
    if(!feedType || !quantity || !cost || !purchaseDate || !supplier || !feedName || averageDailyConsumption === undefined ){
        return res.status(400).json({message:"Input fields are required..."})
    }
    try {
        const qtn = Number(quantity)
        if(qtn <= 0){
            return res.status(400).json({success:false,message:"Quantity must be greater than zero..."})
        }
        const totalCost = Number(cost)
        const feedPricePerkg = totalCost / qtn;
        const parsed = parseFeedType(feedType)
        const newFeed = new Feed({
            feedType,            animalType: parsed.animalType,            poultryType: parsed.poultryType,
            feedCategory: parsed.feedCategory,
            quantity,
            cost,
            purchaseDate,
            supplier,
            consumption: 0,
            averageDailyConsumption: Number(averageDailyConsumption),
            lastConsumptionUpdate: new Date(purchaseDate),
            feedPricePerkg,
            feedName,
        })
        await newFeed.save()
        await recalculatePoultry(newFeed)
        await recalculateLivestock(newFeed)
        res.status(201).json({success:true,message:"Feed Added Successfully"})
    } catch (error) {
        console.log(error.message)
        res.status(500).json({success:false,message:error.message})
    }
}

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const updateFeedConsumption = async (feed) => {
    const now = new Date()
    const lastUpdate = feed.lastConsumptionUpdate ? new Date(feed.lastConsumptionUpdate) : feed.purchaseDate ? new Date(feed.purchaseDate) : startOfDay(new Date())
    const startToday = startOfDay(now)
    const startLast = startOfDay(lastUpdate)
    const diffDays = Math.floor((startToday - startLast) / (1000 * 60 * 60 * 24))
    if (diffDays <= 0) return feed

    const daily = Number(feed.averageDailyConsumption) || 0
    if (daily <= 0) {
        feed.lastConsumptionUpdate = startToday
        const updatedFeed = await Feed.findByIdAndUpdate(feed._id, { lastConsumptionUpdate: startToday }, { returnDocument: 'after' })
        await recalculatePoultry(updatedFeed)
        await recalculateLivestock(updatedFeed)
        return updatedFeed
    }

    const available = Number(feed.quantity) || 0
    const totalDecrease = daily * diffDays
    const actualDecrease = Math.min(totalDecrease, available)
    const updatedQuantity = available - actualDecrease
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

    await recalculatePoultry(updatedFeed)
    await recalculateLivestock(updatedFeed)

    return updatedFeed
}

exports.getFeed = async(req,res)=>{
    try {
        const feeds = await Feed.find()
        if(!feeds || feeds.length === 0){
            return res.status(404).json({success:false,message:"Feed not found..."})
        }

        const updatedFeeds = await Promise.all(feeds.map(updateFeedConsumption))
        res.status(200).json({success:true,message:updatedFeeds,data:updatedFeeds})
    } catch (error) {
        console.log(error.message)
        res.status(500).json({message:error.message})
    }
}

exports.getById = async(req,res)=>{
    const id = req.params.id
    try {
        const feed = await Feed.findById(id)
        if(!feed){
         return  res.status(404).json({success:false,message:"Feed not found..."})
        }
        const updatedFeed = await updateFeedConsumption(feed)
        res.status(200).json({success:true,message:updatedFeed,data:updatedFeed})
    } catch (error) {
        console.log(error.message)
        res.status(500).json({success:false,message:error.message})
    }
}
const recalculatePoultry = async (feed) => {
  try {
    const animalType = feed.animalType || feed.poultryType || parseFeedType(feed.feedType).animalType
    const feedStage = feed.feedCategory || parseFeedType(feed.feedType).feedCategory
    if (!animalType || !feedStage) return

    const poultryList = await Poultry.find({ type: animalType, currentFeedStage: feedStage })
    const totalQuantity = poultryList.reduce((sum, bird) => sum + Number(bird.quantity || 0), 0)
    if (!totalQuantity) return

    const totalConsumption = Number(feed.consumption || 0)
    const poultryConsumePerkg = totalConsumption / totalQuantity
    const feedCostPerPoultry = Number(feed.feedPricePerkg) * poultryConsumePerkg

    const operations = poultryList.map((bird) => {
      const quantity = Number(bird.quantity)
      if (!quantity || quantity <= 0) return null

      const birthDate = bird.birthDay || bird.purchaseDate || new Date()
      const { ageInDays, ageInWeeks } = calculateAge(birthDate)
      const totalFeedCost = feedCostPerPoultry * quantity
      const totalCost = Number(bird.purchasePrice) + totalFeedCost
      const costPerPoultry = totalCost / quantity
      const totalCostPerPoultry = Number(bird.purchasePrice) / quantity + feedCostPerPoultry

      return {
        updateOne: {
          filter: { _id: bird._id },
          update: {
            ageInDays,
            ageInWeeks,
            currentFeedStage: feedStage,
            currentFeedType: feed.feedType,
            currentFeedName: feed.feedName,
            feedStage,
            poultryConsumePerkg,
            feedCostPerPoultry,
            totalFeedCost,
            totalCost,
            costPerPoultry,
            totalCostPerPoultry,
          }
        }
      }
    }).filter(Boolean)

    if (operations.length > 0) {
      await Poultry.bulkWrite(operations)
    }
  } catch (error) {
    console.log("Bulk update error:", error)
  }
};

const recalculateLivestock = async(feed)=>{
    try {
        const livestockType = feed.animalType || feed.poultryType || parseFeedType(feed.feedType).animalType
        const feedStage = feed.feedCategory || parseFeedType(feed.feedType).feedCategory
        const livestock = await LiveStock.find({ type: livestockType, feedStage: feedStage })
        const totalQuantity = livestock.reduce((sum, animal) => sum + Number(animal.quantity || 0), 0)
        if (!totalQuantity) return

        const totalConsumption = Number(feed.consumption || 0)
        const livestockFeedConsumed = totalConsumption / totalQuantity

        const operations = livestock.map((animal)=>{
            const quantity = Number(animal.quantity);
            if(!quantity || quantity <=0)return null;

            const costPrice = Number(feed.feedPricePerkg) * livestockFeedConsumed
            const totalCost = Number(animal.purchasePrice) + costPrice

            return{
                updateOne:{
                    filter:{_id:animal._id},
                    update:{
                        livestockFeedConsumed,
                        costPrice,
                        totalCost
                    }
                }
            }
        }).filter(Boolean)
        if(operations.length > 0){
            await LiveStock.bulkWrite(operations)
        }
    } catch (error) {
        console.log("Bulk update error:", error);
    }
}
exports.edit = async(req,res)=>{
    const id = req.params.id
    try {
        const existingFeed = await Feed.findById(id)
        if(!existingFeed){
            return  res.status(404).json({success:false,message:"Feed not found..."})
        }

        const parsed = parseFeedType(req.body.feedType || existingFeed.feedType)
        const updatedData = {
            ...req.body,
        animalType: parsed.animalType,
        }
        const updatedFeed = await Feed.findByIdAndUpdate(id, updatedData, { returnDocument:'after' })
        const currentFeed = await updateFeedConsumption(updatedFeed)
        await recalculatePoultry(currentFeed)
        await recalculateLivestock(currentFeed)
        const typeToQuery = currentFeed.poultryType || parseFeedType(currentFeed.feedType).poultryType
        const updatedPoultry = await Poultry.find({ type: typeToQuery })
        res.status(200).json({ success:true,data:updatedPoultry, message:"Feed update successful..." })
        
    } catch (error) {
         console.log(error.message)
        res.status(500).json({success:false,message:error.message})
    }
}

exports.del = async(req,res)=>{
    const id = req.params.id
    try {
        const feed = await Feed.findById(id)
        if(!feed){
            return  res.status(404).json({success:false,message:"Feed not found..."})
        }
        const del = await Feed.findByIdAndDelete(id)
        await recalculatePoultry(feed)
        res.status(200).json({ success:true,message:"feed deleted successfully"})
    } catch (error) {
         console.log(error.message)
        res.status(500).json({success:false,message:error.message})
    }
}