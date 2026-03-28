const Poultry = require('../models/poultry')
const Feed = require('../models/feed')
const {
  getFeedStage,
  calculateAge,
  getFeedForStage,
} = require('../utils/feedStageHelper')

exports.createPoultry = async (req, res) => {
    const { batchId, type, quantity, purchaseDate, vaccinationStatus, mortality, purchasePrice } = req.body
    if (!batchId || !type || !quantity || !purchaseDate || !vaccinationStatus || !purchasePrice) {
        return res.status(400).json({ message: 'All fields are required...' })
    }
    try {
        const exist = await Poultry.findOne({ batchId })
        if (exist) {
            return res.status(400).json({ success: false, message: 'Batch ID already exists...' })
        }

        const birthDate = purchaseDate ? new Date(purchaseDate) : new Date()
        const { ageInDays, ageInWeeks } = calculateAge(birthDate)
        const feedStage = getFeedStage(ageInDays)

        const feed = await getFeedForStage(Feed, type, feedStage)
        if (!feed) {
            return res.status(404).json({ success: false, message: 'Appropriate feed not found for this poultry type and age stage.' })
        }

        const adjustedQuantity = mortality ? Number(quantity) - Number(mortality) : Number(quantity)
        if (!adjustedQuantity || adjustedQuantity <= 0) {
            return res.status(400).json({ success: false, message: 'Quantity must be greater than mortality' })
        }

        const pricePerPoultry = Number(purchasePrice) / adjustedQuantity
        const poultryConsumePerkg = Number(feed.consumption) / adjustedQuantity
        const feedCostPerPoultry = Number(feed.feedPricePerkg) * poultryConsumePerkg
        const totalFeedCost = feedCostPerPoultry * adjustedQuantity
        const totalCost = Number(purchasePrice) + totalFeedCost
        const totalCostPerPoultry = pricePerPoultry + feedCostPerPoultry

        const newPoultry = new Poultry({
            batchId,
            type,
            quantity: adjustedQuantity,
            purchaseDate: birthDate,
            vaccinationStatus,
            mortality: mortality || 0,
            purchasePrice: Number(purchasePrice),
            totalCost,
            costPerPoultry: totalCostPerPoultry,
            poultryConsumePerkg,
            feedCostPerPoultry,
            totalFeedCost,
            totalCostPerPoultry,
            feedStage,
            birthDay: birthDate,
            ageInDays,
            ageInWeeks,
            currentFeedStage: feedStage,
            currentFeedType: feed.feedType,
            currentFeedName: feed.feedName,
            feedHistory: [
                {
                    feedStage,
                    feedName: feed.feedName,
                    feedType: feed.feedType,
                    feedCategory: feed.feedCategory,
                    poultryConsumePerkg,
                    feedCostPerPoultry,
                    totalFeedCost,
                    totalCost,
                    costPerPoultry: totalCostPerPoultry,
                    totalCostPerPoultry,
                }
            ]
        })

        await newPoultry.save()
        res.status(201).json({ success: true, message: 'Poultry created successfully...' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

exports.getPoultry = async (req, res) => {
    try {
        const poultryList = await Poultry.find()
        if (poultryList.length === 0) {
            return res.status(404).json({ success: false, message: 'No poultry found...' })
        }

        const data = poultryList.map((bird) => {
            const birthDate = bird.birthDay || bird.purchaseDate || new Date()
            const { ageInDays, ageInWeeks } = calculateAge(birthDate)
            const currentFeedStage = getFeedStage(ageInDays)
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

exports.getPoultryById = async (req, res) => {
    const id = req.params.id
    try {
        const fetchById = await Poultry.findById(id)
        if (!fetchById) {
            return res.status(404).json({ message: "Poultry not found..." })
        }
        res.status(200).json({ success: true, message: fetchById })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}
const updatePoultryBatch = async (poultry) => {
    const birthDate = poultry.birthDay || poultry.purchaseDate || new Date()
    const { ageInDays, ageInWeeks } = calculateAge(birthDate)
    const currentFeedStage = getFeedStage(ageInDays)
    const feed = await getFeedForStage(Feed, poultry.type, currentFeedStage)
    if (!feed) {
        return poultry
    }

    const quantity = Number(poultry.quantity)
    if (!quantity || quantity <= 0) return poultry

    const poultryConsumePerkg = Number(feed.consumption) / quantity
    const feedCostPerPoultry = Number(feed.feedPricePerkg) * poultryConsumePerkg
    const totalFeedCost = feedCostPerPoultry * quantity
    const totalCost = Number(poultry.purchasePrice) + totalFeedCost
    const costPerPoultry = totalCost / quantity
    const totalCostPerPoultry = Number(poultry.purchasePrice) / quantity + feedCostPerPoultry

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
        },
        { returnDocument: 'after' }
    )
}

exports.editPoultry = async(req,res)=>{
    const id = req.params.id
    try {
        const existingPoultry = await Poultry.findById(id)
        if(!existingPoultry){
            return res.status(404).json({message:"poultry not found..."})
        }

        const updateData = {
            ...req.body,
            purchaseDate: req.body.purchaseDate ? new Date(req.body.purchaseDate) : existingPoultry.purchaseDate,
        }

        const editedPoultry = await Poultry.findByIdAndUpdate(id, updateData, { returnDocument: 'after' })
        await updatePoultryBatch(editedPoultry)

        res.status(200).json({success:true,message:"poultry updated successfully..."})
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: error.message || "error while updating poultry" })
    }
}

exports.removePoultry = async(req,res)=>{
    const id = req.params.id
    try {
        const getPoultry = await Poultry.findById(id)
        if(!getPoultry){
            return res.status(404).json({success:false,message:"poultry not found.."})
        }
        const del = await Poultry.findByIdAndDelete(getPoultry)
        res.status(200).json({success:true,message:"Poultry deleted sucessfull.."})
    } catch (error) {
        console.log(error)
        res.status(500).json({message:error.message || "error while updating poultry"})
    }
}

exports.poultryCount = async(req,res)=>{
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