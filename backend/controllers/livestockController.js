const LiveStock = require("../models/liveStock")
const Feed = require('../models/feed.js')

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
        const feed = await Feed.findOne({feedType:type})
         if(!feed){
            return res.status(404).json({success:false,message:"feed not found..."})
        }
        const quantity = Number(1);
        const livestockFeedConsumed = feed.consumption / Number(quantity) || 1
        const costPrice = feed.feedPricePerkg * livestockFeedConsumed
        const totalCost = Number(purchasePrice) + costPrice

        const newLiveStock = new  LiveStock({
            type,tagNumber,breed,age,weight,purchaseDate,healthStatus,livestockFeedConsumed,costPrice,
            totalCost,purchasePrice
        })
        await newLiveStock.save()
        res.status(201).json({success:true,message:'Live stock created successfully...'})
    } catch (error) {
        console.log(error)
        res.status(500).json({success:false,message:error.message})
    }
}

exports.getLivestocks = async(req,res)=>{
    try {
        const getLivestock = await LiveStock.find()
        if(getLivestock.length === 0){
            return res.status(404).json({success:false,message:'No live stock found...'})
        }
        res.status(200).json({success:true,message:'Live stock found...', data:getLivestock})
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
        res.status(200).json({success:true,message:fetchById})
    } catch (error) {
        console.log(error)
        res.status(500).json({success:false,message:error.message})
    }
}

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
    const {id} = req.params
    try {
        const exist = await LiveStock.findById(id)
        if(!exist){
            return res.status(404).json({message:'Animal not Found...'})
        }
        const edit = await LiveStock.findByIdAndUpdate(id,req.body,{returnDocument: 'after'})
        const feed = await Feed.findOne({feedType:edit.type})
        await recalculateLivestock(feed)
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