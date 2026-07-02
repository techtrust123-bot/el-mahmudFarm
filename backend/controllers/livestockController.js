// const LiveStock = require("../models/liveStock")
// const Feed = require('../models/feed.js')
const { recalculateLivestock, recalculateLivestockForTypeAndStage } = require('./feedController')
const { calculateLivestockConsumption } = require('../utils/feedCalculator')
const {
  getFeedStage,
  calculateAge,
  getBirthDateFromAge,
  getFeedForStage,
  parseFeedType,
} = require('../utils/feedStageHelper')
const { sendNotification } = require('../services/emailService')

exports.createLiveStock = async(req,res)=>{
    const { LiveStock, Feed } = req.farmModels
    const {type,tagNumber,breed,age,weight,purchaseDate,purchasePrice,healthStatus,ageInWeeks,ageInDays} = req.body
    if(!type || !tagNumber || !breed || !age || !weight || (!purchaseDate && ageInWeeks == null && ageInDays == null) || !healthStatus || !purchasePrice){
        return res.status(400).json({message:'All fields are required. Provide purchaseDate or ageInWeeks/ageInDays for age calculation.'})
    }
    try {
        const exist = await LiveStock.findOne({ tagNumber })
        if(exist){
            return res.status(400).json({success:false,message:'Tag number already exists...'})
        }

        const birthDate = getBirthDateFromAge({ ageInDays, ageInWeeks, purchaseDate })
        const { ageInDays: resolvedAgeInDays, ageInWeeks: resolvedAgeInWeeks } = calculateAge(birthDate)
        const feedStage = getFeedStage(resolvedAgeInDays, type)

        const feed = await getFeedForStage(Feed, type, feedStage)
        if(!feed){
            return res.status(404).json({success:false,message:"Appropriate feed not found for this livestock type and age stage..."})
        }

        const quantity = Number(req.body.quantity) > 0 ? Number(req.body.quantity) : 1;
        const totalPurchaseCost = Number(purchasePrice) || 0
        const initialCostPerAnimal = quantity > 0 ? totalPurchaseCost / quantity : 0
        const yesterday = new Date(new Date().getTime() - 24 * 60 * 60 * 1000)

        // Save the new livestock first with conservative initial values.
        const newLiveStock = new LiveStock({
            type,
            tagNumber,
            breed,
            age,
            weight,
            purchaseDate: new Date(purchaseDate || new Date()),
            joinDate: new Date(),
            lastFeedUpdate: yesterday,
            healthStatus,
            quantity,
            livestockFeedConsumed: 0,
            totalFeedConsumed: 0,
            costPrice: 0,
            totalCost: totalPurchaseCost,
            purchasePrice: totalPurchaseCost,
            birthDay: birthDate,
            ageInDays: resolvedAgeInDays,
            ageInWeeks: resolvedAgeInWeeks,
            feedStage,
            currentFeedType: feed.feedType,
            currentFeedName: feed.feedName,
            feedHistory: [
                {
                    feedStage,
                    feedName: feed.feedName,
                    feedType: feed.feedType,
                    feedCategory: feed.feedCategory,
                    livestockFeedConsumed: 0,
                    feedCostPerAnimal: 0,
                    totalFeedCost: 0,
                    totalCost: totalPurchaseCost,
                    costPrice: 0,
                    timestamp: new Date()
                }
            ]
        })

        const saved = await newLiveStock.save()

        if (req.user?.email && ['sick', 'poor', 'critical', 'unhealthy'].includes(String(healthStatus).toLowerCase())) {
            await sendNotification(req.user.email, 'ANIMAL_HEALTH_ALERT', {
                userName: req.user.name || 'User',
                animalType: type,
                animalId: tagNumber,
                issue: healthStatus
            })
        }

        // Recalculate feeds (this will include the newly saved animal)
        try {
            await recalculateLivestockForTypeAndStage(type, feedStage, req.farmModels)
        } catch (err) {
            console.log('Error recalculating feeds after livestock create:', err.message)
        }

        // Update the saved livestock now that feeds and rates have been recalculated
        try {
            await updateLivestock(saved, req.farmModels)
        } catch (err) {
            console.log('Error updating saved livestock after recalculation:', err.message)
        }

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

        const purchaseDate = req.body.purchaseDate ? new Date(req.body.purchaseDate) : exist.purchaseDate
        const birthDate = getBirthDateFromAge({
          ageInDays: req.body.ageInDays,
          ageInWeeks: req.body.ageInWeeks,
          purchaseDate: purchaseDate || exist.birthDay || exist.purchaseDate,
        })
        const { ageInDays: resolvedAgeInDays, ageInWeeks: resolvedAgeInWeeks } = calculateAge(birthDate)

        const updateData = {
            ...req.body,
            purchaseDate,
            birthDay: birthDate,
            ageInDays: resolvedAgeInDays,
            ageInWeeks: resolvedAgeInWeeks,
        }

        const edit = await LiveStock.findOneAndUpdate({ _id: id }, updateData, {returnDocument: 'after'})
        if (!edit) {
            return res.status(404).json({ success:false, message:'Animal not found or not authorized.' })
        }
        await updateLivestock(edit, req.farmModels)
        try {
            await recalculateLivestockForTypeAndStage(edit.type, edit.feedStage || edit.currentFeedStage, req.farmModels)
        } catch (err) {
            console.log('Error recalculating feeds after livestock edit:', err.message)
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
        const { Feed } = req.farmModels
        await LiveStock.findByIdAndDelete(animal._id)
        try {
            await recalculateLivestockForTypeAndStage(animal.type, animal.feedStage || animal.currentFeedStage, req.farmModels)
        } catch (err) {
            console.log('Error recalculating feeds after livestock delete:', err.message)
        }
        res.status(200).json({success:true,message:'Animal Deleted Successfull'})
    } catch (error) {
         console.log(error)
        res.status(500).json({success:false,message:error.message})
    }
}