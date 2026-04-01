const LiveStock = require("../models/liveStock");
const Poultry = require("../models/poultry");
const Sells = require("../models/sells");
const mongoose = require('mongoose')


exports.recordSales = async(req,res)=>{
    const {batchId,date,animalType,quantitySold,pricePerUnit,customerName,buyerContact,status,tagNumber}= req.body
    if(!date || !animalType || !pricePerUnit || !customerName || !buyerContact || !status){
        return res.status(400).json({success:false,message:"All input fields are required.."})
    }
    try {
        let profit = 0;
        let totalAmount = 0;
        let costPrice = 0;
        if(animalType === 'Poultry'){
            const poultry = await Poultry.findOne({batchId})
             if(!poultry){
                return res.status(404).json({success:false,message:"batchId not found"})
            }
             if (poultry.quantity < quantitySold) {
                return res.status(400).json({ success: false, message: "Not enough poultry in this batch" });
            }
             costPrice = Number(poultry.costPerPoultry)
             totalAmount = quantitySold * pricePerUnit;
              profit = Number(pricePerUnit - costPrice) * quantitySold
        }else if(animalType === 'Livestock'){
            const livestock = await LiveStock.findOne({tagNumber})
            if(!livestock){
                return res.status(404).json({success:false,message:"livestock  not found..."})
            }
            const qtn = 1
            totalAmount = Number(pricePerUnit) * qtn;
            costPrice = Number(livestock.totalCost)
            profit = Number(pricePerUnit - costPrice) * qtn
        }
        const invoiceId = 'INV' + Date.now()
        const sells = await Sells.create({
            animalType,
            batchId,
            pricePerUnit,
            costPrice,
            profit,
            totalAmount,
            date,
            customerName,
            quantitySold,
            status,
            buyerContact,
            tagNumber,
            invoiceId
        })
        if(animalType === 'Poultry'){
            const poultry = await Poultry.findOne({batchId})
            if(!poultry){
                return res.status(404).json({success:false,message:"batchId not found"})
            }
            if (poultry.quantity < quantitySold) {
             return res.status(400).json({
                 success:false,
                    message:"Not enough poultry in this batch"
                })
             }

             poultry.quantity -= quantitySold
                if(poultry.quantity === 0){
                    poultry.status = 'sold'
                }

             await poultry.save();
        }else if(animalType === "Livestock"){
            const livestock = await LiveStock.findOne({tagNumber})
            if(!livestock){
                return res.status(404).json({success:false,message:"livestock  not found..."})
            }
            if(livestock.status === 'sold'){
                return res.status(400).json({success:false,message:"livestock already sold..."})
            }
            livestock.status = 'sold'
            await livestock.save()
        }
        res.status(201).json({success:true,message:'sell recorded successfull...'})
    } catch (error) {
        console.log(error)
        res.status(500).json({success:false,message:error.message})
    }
}

exports.getSells = async(req,res)=>{
    try {
        const sells = await Sells.find()
        if(sells.length === 0){
            return res.status(404).json({success:false,message:'sells not found...'})
        }
        res.status(200).json({success:true,message:sells})
    } catch (error) {
           console.log(error)
        res.status(500).json({success:false,message:error.message})
    }
}

exports.getById = async(req,res)=>{
    const id = req.params.id
    try {
        const sells = await Sells.findById(id)
        if(!sells){
            return res.status(404).json({success:false,message:'sells not found...'})
        }
        res.status(200).json({success:true,message:sells})
    } catch (error) {
           console.log(error)
        res.status(500).json({success:false,message:error.message})
    }
}

exports.edit = async(req,res)=>{
    const id = req.params.id
    try {
        const sells = await Sells.findById(id)
         if(!sells){
            return res.status(404).json({success:false,message:'sells not found...'})
        }
        const updateSells = await Sells.findByIdAndUpdate(id,req.body,{new:true})
        res.status(200).json({success:true,message:"sells updated successfull"})
    } catch (error) {
           console.log(error)
        res.status(500).json({success:false,message:error.message})
    }
}

exports.remove = async(req,res)=>{
    const id = req.params.id
    if(!id || !mongoose.Types.ObjectId.isValid(id)){
        return res.status(400).json({success:false,message:'Invalid sell ID'})
    }
    try {
        const sells = await Sells.findById(id)
         if(!sells){
            return res.status(404).json({success:false,message:'sells not found...'})
        }
        const del = await Sells.findByIdAndDelete(id)
        res.status(200).json({success:true,message:"sells deleted successfull"})
    } catch (error) {
           console.log(error)
        res.status(500).json({success:false,message:error.message})
    }
}