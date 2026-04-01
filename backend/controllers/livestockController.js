const LiveStock = require("../models/liveStock")
const Feed = require('../models/feed.js')
const {
  getFeedStage,
  calculateAge,
  getFeedForStage,
  parseFeedType,
} = require('../utils/feedStageHelper')

exports.createLiveStock = async(req,res)=>{
    const {type,tagNumber,breed,age,weight,purchaseDate,purchasePrice,healthStatus} = req.body
    if(!type || !tagNumber || !breed || !age || !weight || !purchaseDate || !healthStatus || !purchasePrice){
        return res.status(400).json({message:'All fields are required...'})
    }
    try {
        const exist = await LiveStock.findOne({tagNumber})
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

        const quantity = Number(1);
        const livestockFeedConsumed = Number(feed.consumption) / quantity
        const feedCostPerAnimal = Number(feed.feedPricePerkg) * livestockFeedConsumed
        const costPrice = feedCostPerAnimal
        const totalCost = Number(purchasePrice) + costPrice

        const newLiveStock = new  LiveStock({
            type,tagNumber,breed,age,weight,purchaseDate,healthStatus,livestockFeedConsumed,costPrice,
            totalCost,purchasePrice,
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
                    feedCostPerAnimal,
                    totalFeedCost: costPrice,
                    totalCost,
                    costPrice,
                    timestamp: new Date()
                }
            ]
        })
        await newLiveStock.save()
        res.status(201).json({success:true,message:'Livestock created successfully...'})
    } catch (error) {
        console.log(error)
        res.status(500).json({success:false,message:error.message})
    }
}

exports.getLivestocks = async(req,res)=>{
    try {
        const livestocks = await LiveStock.find()
        if(livestocks.length === 0){
            return res.status(404).json({success:false,message:'No live stock found...'})
        }
        
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

exports.getLiveStockById = async(req,res)=>{
    const id = req.params.id
    try {
        const fetchById = await LiveStock.findById(id)
        if(!fetchById){
            return res.status(404).json({messahe:"animal not found..."})
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

const recalculateLivestock = async(feed)=>{
    try {
        if (!feed) return
        const livestockType = feed.animalType || feed.poultryType || parseFeedType(feed.feedType || '').animalType
        if (!livestockType) return

        const livestock = await LiveStock.find({ type: livestockType })
        const operations = livestock.map((animal)=>{
            const quantity = Number(animal.quantity);
            if(!quantity || quantity <= 0) return null;
            
            const livestockFeedConsumed = Number(feed.consumption || 0) / quantity
            
                        if(animal.status === 'sold'){
                             livestockFeedConsumed = Number(0)
                        }
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

const updateLivestock = async (livestock) => {
    const birthDate = livestock.birthDay || livestock.purchaseDate || new Date()
    const { ageInDays, ageInWeeks } = calculateAge(birthDate)
    const feedStage = getFeedStage(ageInDays, livestock.type)
    const feed = await getFeedForStage(Feed, livestock.type, feedStage)
    if (!feed) {
        return livestock
    }

    const quantity = Number(livestock.quantity)
    if (!quantity || quantity <= 0) return livestock

    const livestockFeedConsumed = Number(feed.consumption) / quantity
    const feedCostPerAnimal = Number(feed.feedPricePerkg) * livestockFeedConsumed
    const totalFeedCost = feedCostPerAnimal * quantity
    const totalCost = Number(livestock.purchasePrice) + feedCostPerAnimal
    const costPrice = feedCostPerAnimal

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
    const {id} = req.params
    try {
        const exist = await LiveStock.findById(id)
        if(!exist){
            return res.status(404).json({message:'Animal not Found...'})
        }
        
        const updateData = {
            ...req.body,
            purchaseDate: req.body.purchaseDate ? new Date(req.body.purchaseDate).toISOString() : exist.purchaseDate,
            birthDay: req.body.purchaseDate ? new Date(req.body.purchaseDate) : exist.birthDay,
        }
        
        const edit = await LiveStock.findByIdAndUpdate(id, updateData, {returnDocument: 'after'})
        await updateLivestock(edit)
        const feed = await Feed.findOne({ animalType: edit.type })
        if (feed) {
            await recalculateLivestock(feed)
        }
        res.status(200).json({success:true,message:"Livestock Updated Successful..."})
    } catch (error) {
          console.log(error)
        res.status(500).json({success:false,message:error.message})
    }
}

exports.remove = async(req,res)=>{
    const id = req.params.id
    try {
        const animal = await LiveStock.findById(id)
        if(!animal){
            return res.status(404).json({message:'animal not found...'})
        }
        await LiveStock.findByIdAndDelete(animal)
        res.status(200).json({success:true,message:'Animal Deleted Successfull'})
    } catch (error) {
         console.log(error)
        res.status(500).json({success:false,message:error.message}) 
    }
}