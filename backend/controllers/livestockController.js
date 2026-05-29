// const LiveStock = require("../models/liveStock")
// const Feed = require('../models/feed.js')
const { recalculateLivestock } = require('./feedController')
const { calculateLivestockConsumption } = require('../utils/feedCalculator')
const {
  getFeedStage,
  calculateAge,
  getFeedForStage,
  parseFeedType,
} = require('../utils/feedStageHelper')

exports.createLiveStock = async(req,res)=>{
    const { LiveStock, Feed } = req.farmModels
    const {type,tagNumber,breed,age,weight,purchaseDate,purchasePrice,healthStatus} = req.body
    if(!type || !tagNumber || !breed || !age || !weight || !purchaseDate || !healthStatus || !purchasePrice){
        return res.status(400).json({message:'All fields are required...'})
    }
    try {
        const exist = await LiveStock.findOne({ tagNumber })
        if(exist){
            return res.status(400).json({success:false,message:'Tag number already exists...'})
        }

        const birthDate = purchaseDate ? new Date(purchaseDate) : new Date()
        const { ageInDays, ageInWeeks } = calculateAge(birthDate)
        const feedStage = getFeedStage(ageInDays, type)

        const feed = await getFeedForStage(Feed, type, feedStage)
        if(!feed){
            return res.status(404).json({success:false,message:"Appropriate feed not found for this livestock type and age stage..."})
        }

        const quantity = Number(req.body.quantity) > 0 ? Number(req.body.quantity) : 1;
        const batchStats = calculateLivestockConsumption(feed, {
          joinDate: new Date(),
          quantity,
          purchasePrice: Number(purchasePrice),
        })
        const livestockFeedConsumed = batchStats.livestockFeedConsumedPerAnimal;
        const costPrice = batchStats.costPrice;
        const totalCost = batchStats.totalCost;

        const newLiveStock = new LiveStock({
            type,
            tagNumber,
            breed,
            age,
            weight,
            purchaseDate,
            joinDate: new Date(),
            healthStatus,
            quantity,
            livestockFeedConsumed,
            totalFeedConsumed: batchStats.totalFeedConsumed,
            costPrice,
            totalCost,
            purchasePrice,
            birthDay: birthDate,
            ageInDays,
            ageInWeeks,
            feedStage,
            currentFeedType: feed.feedType,
            currentFeedName: feed.feedName,
            feedHistory: [
                {
                    feedStage,
                    feedName: feed.feedName,
                    feedType: feed.feedType,
                    feedCategory: feed.feedCategory,
                    livestockFeedConsumed,
                    feedCostPerAnimal: costPrice,
                    totalFeedCost: batchStats.totalFeedConsumed,
                    totalCost,
                    costPrice,
                    timestamp: new Date()
                }
            ]
        })
        await newLiveStock.save()
        await recalculateLivestock(feed, req.farmModels)
        res.status(201).json({success:true,message:'Livestock created successfully...'})
    } catch (error) {
        console.log(error)
        res.status(500).json({success:false,message:error.message})
    }
}

exports.getLivestocks = async(req,res)=>{
    const { LiveStock } = req.farmModels
    try {
        const livestocks = await LiveStock.find()
        
        const data = livestocks.map((animal) => {
            const birthDate = animal.birthDay || animal.purchaseDate || new Date()
            const { ageInDays, ageInWeeks } = calculateAge(birthDate)
            const feedStage = getFeedStage(ageInDays, animal.type)
            return {
                ...animal.toObject(),
                ageInDays,
                ageInWeeks,
                feedStage,
            }
        })
        
        res.status(200).json({success:true,message:'Live stock found...', data})
    } catch (error) {
        console.log(error)
        res.status(500).json({success:false,message:'Error fetching live stock...'})
    }
}

exports.getAvailableLivestock = async(req,res)=>{
    const { LiveStock } = req.farmModels
    try {
        const livestocks = await LiveStock.find({ status: 'available' })
        
        const data = livestocks.map((animal) => {
            const birthDate = animal.birthDay || animal.purchaseDate || new Date()
            const { ageInDays, ageInWeeks } = calculateAge(birthDate)
            const feedStage = getFeedStage(ageInDays, animal.type)
            return {
                ...animal.toObject(),
                ageInDays,
                ageInWeeks,
                feedStage,
            }
        })
        
        res.status(200).json({success:true,message:'Available livestock found...', data})
    } catch (error) {
        console.log(error)
        res.status(500).json({success:false,message:'Error fetching available livestock...'})
    }
}

exports.getSoldLivestock = async(req,res)=>{
    const { LiveStock } = req.farmModels
    try {
        const livestocks = await LiveStock.find({ status: 'sold' })
        
        const data = livestocks.map((animal) => {
            const birthDate = animal.birthDay || animal.purchaseDate || new Date()
            const { ageInDays, ageInWeeks } = calculateAge(birthDate)
            const feedStage = getFeedStage(ageInDays, animal.type)
            return {
                ...animal.toObject(),
                ageInDays,
                ageInWeeks,
                feedStage,
            }
        })
        
        res.status(200).json({success:true,message:'Sold livestock found...', data})
    } catch (error) {
        console.log(error)
        res.status(500).json({success:false,message:'Error fetching sold livestock...'})
    }
}

exports.getLiveStockById = async(req,res)=>{
    const { LiveStock } = req.farmModels
    const id = req.params.id
    try {
        const fetchById = await LiveStock.findOne({ _id: id })
        
        if (!fetchById) {
            return res.status(404).json({message:"animal not found..."})
        }
        
        const birthDate = fetchById.birthDay || fetchById.purchaseDate || new Date()
        const { ageInDays, ageInWeeks } = calculateAge(birthDate)
        const feedStage = getFeedStage(ageInDays, fetchById.type)
        
        const data = {
            ...fetchById.toObject(),
            ageInDays,
            ageInWeeks,
            feedStage,
        }
        
        res.status(200).json({success:true,message:data})
    } catch (error) {
        console.log(error)
        res.status(500).json({success:false,message:error.message})
    }
}

const updateLivestock = async (livestock, farmModels) => {
    const { Feed, LiveStock } = farmModels
    const birthDate = livestock.birthDay || livestock.purchaseDate || new Date()
    const { ageInDays, ageInWeeks } = calculateAge(birthDate)
    const feedStage = getFeedStage(ageInDays, livestock.type)
    const feed = await getFeedForStage(Feed, livestock.type, feedStage)
    if (!feed) {
        return livestock
    }

    if (livestock.status === 'sold') {
        return await LiveStock.findByIdAndUpdate(
            livestock._id,
            {
                ageInDays,
                ageInWeeks,
                feedStage,
                currentFeedType: feed.feedType,
                currentFeedName: feed.feedName,
                livestockFeedConsumed: 0,
                costPrice: 0,
                totalCost: Number(livestock.purchasePrice || 0),
            },
            { returnDocument: 'after' }
        )
    }

    const quantity = Number(livestock.quantity)
    if (!quantity || quantity <= 0) return livestock

    const batch = calculateLivestockConsumption(feed, livestock)
    const livestockFeedConsumed = batch.livestockFeedConsumedPerAnimal
    const costPrice = batch.costPrice
    const totalCost = batch.totalCost

    return await LiveStock.findByIdAndUpdate(
        livestock._id,
        {
            ageInDays,
            ageInWeeks,
            feedStage,
            currentFeedType: feed.feedType,
            currentFeedName: feed.feedName,
            livestockFeedConsumed,
            costPrice,
            totalCost,
        },
        { returnDocument: 'after' }
    )
}

exports.edit = async(req,res)=>{
    const { LiveStock, Feed } = req.farmModels
    const {id} = req.params
    try {
        const exist = await LiveStock.findOne({ _id: id })
        if(!exist){
            return res.status(404).json({message:'Animal not Found...'})
        }

        const updateData = {
            ...req.body,
            purchaseDate: req.body.purchaseDate ? new Date(req.body.purchaseDate).toISOString() : exist.purchaseDate,
            birthDay: req.body.purchaseDate ? new Date(req.body.purchaseDate) : exist.birthDay,
        }

        const edit = await LiveStock.findOneAndUpdate({ _id: id }, updateData, {returnDocument: 'after'})
        if (!edit) {
            return res.status(404).json({ success:false, message:'Animal not found or not authorized.' })
        }
        await updateLivestock(edit, req.farmModels)
        const feed = await Feed.findOne({ animalType: edit.type })
        if (feed) {
            await recalculateLivestock(feed, req.farmModels)
        }
        res.status(200).json({success:true,message:"Livestock Updated Successful..."})
    } catch (error) {
          console.log(error)
        res.status(500).json({success:false,message:error.message})
    }
}

exports.remove = async(req,res)=>{
    const { LiveStock } = req.farmModels
    const id = req.params.id
    try {
        const animal = await LiveStock.findOne({ _id: id })
        if(!animal){
            return res.status(404).json({message:'animal not found...'})
        }
        await LiveStock.findByIdAndDelete(animal._id)
        res.status(200).json({success:true,message:'Animal Deleted Successfull'})
    } catch (error) {
         console.log(error)
        res.status(500).json({success:false,message:error.message})
    }
}