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
    const {feedType,quantity,cost,purchaseDate,supplier,consumption,feedName} = req.body
    if(!feedType || !quantity || !cost || !purchaseDate || !supplier || !feedName ){
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
            feedType,
            poultryType: parsed.poultryType,
            feedCategory: parsed.feedCategory,
            quantity,
            cost,
            purchaseDate,
            supplier,
            consumption,
            feedPricePerkg,
            feedName,
        })
        await newFeed.save()
        await recalculatePoultry(newFeed)
        await recalculateLivestock(newFeed)
        res.status(201).json({success:true,message:"Feed Added Successfull"})
    } catch (error) {
        console.log(error.message)
        res.status(500).json({success:false,message:error.message})
    }
}

exports.getFeed = async(req,res)=>{
    try {
        const feed = await Feed.find()
        if(!feed){
            return res.status(404).json({success:false,message:"Feed not found..."})
        }
        res.status(200).json({success:true,message:feed})
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
        res.status(200).json({success:true,message:feed})
    } catch (error) {
        console.log(error.message)
        res.status(500).json({success:false,message:error.message})
    }
}
const recalculatePoultry = async (feed) => {
  try {
    const poultryType = feed.poultryType || parseFeedType(feed.feedType).poultryType
    if (!poultryType) return

    const poultryList = await Poultry.find({ type: poultryType })
    const operations = []

    for (const bird of poultryList) {
      const birthDate = bird.birthDay || bird.purchaseDate || new Date()
      const { ageInDays, ageInWeeks } = calculateAge(birthDate)
      const feedStage = getFeedStage(ageInDays)
      const matchedFeed = await getFeedForStage(Feed, poultryType, feedStage)
      if (!matchedFeed) continue

      const quantity = Number(bird.quantity)
      if (!quantity || quantity <= 0) continue

      const poultryConsumePerkg = Number(matchedFeed.consumption) / quantity
      const feedCostPerPoultry = Number(matchedFeed.feedPricePerkg) * poultryConsumePerkg
      const totalFeedCost = feedCostPerPoultry * quantity
      const totalCost = Number(bird.purchasePrice) + totalFeedCost
      const costPerPoultry = totalCost / quantity
      const totalCostPerPoultry = Number(bird.purchasePrice) / quantity + feedCostPerPoultry

      operations.push({
        updateOne: {
          filter: { _id: bird._id },
          update: {
            ageInDays,
            ageInWeeks,
            currentFeedStage: feedStage,
            currentFeedType: matchedFeed.feedType,
            currentFeedName: matchedFeed.feedName,
            feedStage,
            poultryConsumePerkg,
            feedCostPerPoultry,
            totalFeedCost,
            totalCost,
            costPerPoultry,
            totalCostPerPoultry,
          }
        }
      })
    }

    if (operations.length > 0) {
      await Poultry.bulkWrite(operations)
    }
  } catch (error) {
    console.log("Bulk update error:", error)
  }
};

const recalculateLivestock = async(feed)=>{
    try {
        const livestock = await LiveStock.find({type:feed.feedType})
        const operations = livestock.map((animal)=>{
            const quantity = Number(animal.quantity);
            if(!quantity || quantity <=0)return null;

            const livestockFeedConsumed = feed.consumption / quantity

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
            poultryType: parsed.poultryType,
            feedCategory: parsed.feedCategory,
        }

        const updatedFeed = await Feed.findByIdAndUpdate(id, updatedData, { returnDocument:'after' })
        await recalculatePoultry(updatedFeed)
        await recalculateLivestock(updatedFeed)
        const typeToQuery = updatedFeed.poultryType || parseFeedType(updatedFeed.feedType).poultryType
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