// const Poultry = require('../models/poultry')
// const Feed = require('../models/feed')
const { recalculatePoultry } = require('./feedController')
const { calculateBatchConsumption } = require('../utils/feedCalculator')
const {
  getFeedStage,
  calculateAge,
  getBirthDateFromAge,
  getFeedForStage,
} = require('../utils/feedStageHelper')
const { sendNotification } = require('../services/emailService')

exports.createPoultry = async (req, res) => {
    const { Poultry, Feed } = req.farmModels
    const { batchId, type, quantity, purchaseDate, vaccinationStatus, mortality, purchasePrice, ageInWeeks, ageInDays } = req.body
    if (!batchId || !type || !quantity || (!purchaseDate && ageInWeeks == null && ageInDays == null) || !vaccinationStatus || !purchasePrice) {
        return res.status(400).json({ message: 'All fields are required. Provide purchaseDate or ageInWeeks/ageInDays for age calculation.' })
    }
    try {
        const exist = await Poultry.findOne({ batchId })
        if (exist) {
            return res.status(400).json({ success: false, message: 'Batch ID already exists...' })
        }

        const birthDate = getBirthDateFromAge({ ageInDays, ageInWeeks, purchaseDate })
        const { ageInDays: resolvedAgeInDays, ageInWeeks: resolvedAgeInWeeks } = calculateAge(birthDate)
        const feedStage = getFeedStage(resolvedAgeInDays, type)

        const feed = await getFeedForStage(Feed, type, feedStage)
        if (!feed) {
            return res.status(404).json({ success: false, message: 'Appropriate feed not found for this poultry type and age stage.' })
        }

        const adjustedQuantity = mortality ? Number(quantity) - Number(mortality) : Number(quantity)
        if (!adjustedQuantity || adjustedQuantity <= 0) {
            return res.status(400).json({ success: false, message: 'Quantity must be greater than mortality' })
        }

        const totalPurchaseCost = Number(purchasePrice) || 0
        const initialCostPerPoultry = adjustedQuantity > 0 ? totalPurchaseCost / adjustedQuantity : 0
        const yesterday = new Date(new Date().getTime() - 24 * 60 * 60 * 1000)
        const newPoultry = new Poultry({
            batchId,
            type,
            status: 'available',
            quantity: adjustedQuantity,
            joinDate: new Date(),
            purchaseDate: new Date(purchaseDate || new Date()),
            lastFeedUpdate: yesterday,
            vaccinationStatus,
            mortality: mortality || 0,
            purchasePrice: totalPurchaseCost,
            totalFeedConsumed: 0,
            totalCost: totalPurchaseCost,
            costPerPoultry: initialCostPerPoultry,
            poultryConsumePerkg: 0,
            feedCostPerPoultry: 0,
            totalFeedCost: 0,
            totalCostPerPoultry: initialCostPerPoultry,
            feedStage,
            birthDay: birthDate,
            ageInDays: resolvedAgeInDays,
            ageInWeeks: resolvedAgeInWeeks,
            currentFeedStage: feedStage,
            currentFeedType: feed.feedType,
            currentFeedName: feed.feedName,
            feedHistory: [
                {
                    feedStage,
                    feedName: feed.feedName,
                    feedType: feed.feedType,
                    feedCategory: feed.feedCategory,
                    poultryConsumePerkg: 0,
                    feedCostPerPoultry: 0,
                    totalFeedCost: 0,
                    totalCost: totalPurchaseCost,
                    costPerPoultry: initialCostPerPoultry,
                    totalCostPerPoultry: initialCostPerPoultry,
                }
            ]
        })
        await newPoultry.save()

        if (req.user?.email && ['sick', 'poor', 'critical', 'unhealthy'].includes(String(vaccinationStatus).toLowerCase())) {
            await sendNotification(req.user.email, 'ANIMAL_HEALTH_ALERT', {
                userName: req.user.name || 'User',
                animalType: type,
                animalId: batchId,
                issue: vaccinationStatus
            })
        }

        await recalculatePoultry(feed, req.farmModels)
        res.status(201).json({ success: true, message: 'Poultry created successfully...' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

exports.getPoultry = async (req, res) => {
    const { Poultry } = req.farmModels
    try {
        const poultryList = await Poultry.find()

        const data = poultryList.map((bird) => {
            const birthDate = bird.birthDay || bird.purchaseDate || new Date()
            const { ageInDays, ageInWeeks } = calculateAge(birthDate)
            const currentFeedStage = getFeedStage(ageInDays, bird.type)
            return {
                ...bird.toObject(),
                ageInDays,
                ageInWeeks,
                currentFeedStage,
            }
        })

        res.status(200).json({ success: true, message: 'Poultry found...', data })
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching poultry...' })
    }
}

exports.getAvailablePoultry = async (req, res) => {
    const { Poultry } = req.farmModels
    try {
        const poultryList = await Poultry.find({ status: 'available' })

        const data = poultryList.map((bird) => {
            const birthDate = bird.birthDay || bird.purchaseDate || new Date()
            const { ageInDays, ageInWeeks } = calculateAge(birthDate)
            const currentFeedStage = getFeedStage(ageInDays, bird.type)
            return {
                ...bird.toObject(),
                ageInDays,
                ageInWeeks,
                currentFeedStage,
            }
        })

        res.status(200).json({ success: true, message: 'Available poultry found...', data })
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching available poultry...' })
    }
}

exports.getSoldPoultry = async (req, res) => {
    const { Poultry } = req.farmModels
    try {
        const poultryList = await Poultry.find({ status: 'sold' })

        const data = poultryList.map((bird) => {
            const birthDate = bird.birthDay || bird.purchaseDate || new Date()
            const { ageInDays, ageInWeeks } = calculateAge(birthDate)
            const currentFeedStage = getFeedStage(ageInDays, bird.type)
            return {
                ...bird.toObject(),
                ageInDays,
                ageInWeeks,
                currentFeedStage,
            }
        })

        res.status(200).json({ success: true, message: 'Sold poultry found...', data })
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching sold poultry...' })
    }
}

exports.getPoultryById = async (req, res) => {
    const { Poultry } = req.farmModels
    const id = req.params.id
    try {
        const fetchById = await Poultry.findOne({ _id: id })
        if (!fetchById) {
            return res.status(404).json({ message: "Poultry not found..." })
        }
        res.status(200).json({ success: true, message: fetchById })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}
const updatePoultryBatch = async (poultry, farmModels) => {
    const { Feed, Poultry } = farmModels
    const birthDate = poultry.birthDay || poultry.purchaseDate || new Date()
    const { ageInDays, ageInWeeks } = calculateAge(birthDate)
    const currentFeedStage = getFeedStage(ageInDays, poultry.type)
    const feed = await getFeedForStage(Feed, poultry.type, currentFeedStage)
    if (!feed) {
        return poultry
    }

    const quantity = Number(poultry.quantity)
    if (!quantity || quantity <= 0) return poultry

    const poultryConsumePerkg = Number(feed.consumption) / quantity
    const totalQuantity = quantity - (Number(poultry.mortality) || 0)
    const feedCostPerPoultry = Number(feed.feedPricePerkg) * poultryConsumePerkg
    const totalFeedCost = feedCostPerPoultry * totalQuantity
    const totalCost = Number(poultry.purchasePrice) + totalFeedCost
    const costPerPoultry = totalCost / quantity
    const totalCostPerPoultry = Number(poultry.purchasePrice) / totalQuantity + feedCostPerPoultry

    return await Poultry.findByIdAndUpdate(
        poultry._id,
        {
            ageInDays,
            ageInWeeks,
            currentFeedStage,
            currentFeedType: feed.feedType,
            currentFeedName: feed.feedName,
            feedStage: currentFeedStage,
            poultryConsumePerkg,
            feedCostPerPoultry,
            totalFeedCost,
            totalCost,
            costPerPoultry,
            totalCostPerPoultry,
            quantity: totalQuantity,
        },
        { returnDocument: 'after' }
    )
}

exports.editPoultry = async(req,res)=>{
    const { Poultry } = req.farmModels
    const id = req.params.id
    try {
        const existingPoultry = await Poultry.findOne({ _id: id })
        if(!existingPoultry){
            return res.status(404).json({message:"poultry not found..."})
        }

        const purchaseDate = req.body.purchaseDate ? new Date(req.body.purchaseDate) : existingPoultry.purchaseDate
        const birthDate = getBirthDateFromAge({
          ageInDays: req.body.ageInDays,
          ageInWeeks: req.body.ageInWeeks,
          purchaseDate: purchaseDate || existingPoultry.birthDay || existingPoultry.purchaseDate,
        })
        const { ageInDays: resolvedAgeInDays, ageInWeeks: resolvedAgeInWeeks } = calculateAge(birthDate)

        const updateData = {
            ...req.body,
            purchaseDate,
            birthDay: birthDate,
            ageInDays: resolvedAgeInDays,
            ageInWeeks: resolvedAgeInWeeks,
        }

        const editedPoultry = await Poultry.findByIdAndUpdate(id, updateData, { returnDocument: 'after' })
        await updatePoultryBatch(editedPoultry, req.farmModels)

        res.status(200).json({success:true,message:"poultry updated successfully..."})
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: error.message || "error while updating poultry" })
    }
}

exports.removePoultry = async(req,res)=>{
    const { Poultry, Feed } = req.farmModels
    const id = req.params.id
    try {
        const getPoultry = await Poultry.findOne({ _id: id })
        if(!getPoultry){
            return res.status(404).json({success:false,message:"poultry not found.."})
        }
        const del = await Poultry.findByIdAndDelete(getPoultry)
        const feed = await getFeedForStage(Feed, getPoultry.type, getPoultry.currentFeedStage || getPoultry.feedStage)
        if (feed) await recalculatePoultry(feed, req.farmModels)
        res.status(200).json({success:true,message:"Poultry deleted sucessfull.."})
    } catch (error) {
        console.log(error)
        res.status(500).json({message:error.message || "error while updating poultry"})
    }
}

exports.poultryCount = async(req,res)=>{
    const { Poultry } = req.farmModels
    try {
        const poultry = await Poultry.find()
        if(!poultry){
            return res.status(404).json({success:false,message:"no poultry found..."})
        }
        const totalPoultry = await Poultry.countDocuments()
        res.status(200).json({success:true,stats:{
            poultry:totalPoultry
        }})
    } catch (error) {
        console.log(error)
        res.status(500).json({message:error.message || "error while updating poultry"})
    }
}