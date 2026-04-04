// const LiveStock = require("../models/liveStock");
// const Poultry = require("../models/poultry");
// const Sells = require("../models/sells");
const mongoose = require('mongoose')


exports.recordSales = async (req, res) => {
    const { LiveStock, Poultry, Sells } = req.farmModels
    const incoming = Array.isArray(req.body.orders) ? req.body.orders : req.body;
    const orders = Array.isArray(incoming) ? incoming : [incoming];

    if (!orders.length) {
        return res.status(400).json({ success: false, message: 'No order items provided.' });
    }

    const invoiceBase = 'INV' + Date.now();
    const createdSales = [];

    try {
        for (let index = 0; index < orders.length; index += 1) {
            const order = orders[index];
            const {
                batchId,
                date,
                animalType,
                quantitySold = 1,
                pricePerUnit,
                customerName,
                buyerContact,
                status,
                tagNumber,
                type,
            } = order;

            if (!date || !animalType || !pricePerUnit || !customerName || !buyerContact || !status) {
                return res.status(400).json({ success: false, message: 'All required fields are required for every order item.' });
            }

            let profit = 0;
            let totalAmount = 0;
            let costPrice = 0;
            let orderBatchId = batchId;
            let orderTagNumber = tagNumber;

            if (animalType === 'Poultry') {
                if (!batchId) {
                    return res.status(400).json({ success: false, message: 'batchId is required for poultry orders.' });
                }

                const poultry = await Poultry.findOne({ batchId });
                if (!poultry) {
                    return res.status(404).json({ success: false, message: `Poultry batch not found for ${batchId}` });
                }
                if (poultry.quantity < quantitySold) {
                    return res.status(400).json({ success: false, message: `Not enough poultry available in batch ${batchId}` });
                }

                costPrice = Number(poultry.costPerPoultry || poultry.purchasePrice || 0);
                totalAmount = Number(quantitySold) * Number(pricePerUnit);
                profit = Number(pricePerUnit - costPrice) * Number(quantitySold);

                poultry.quantity -= Number(quantitySold);
                if (poultry.quantity <= 0) {
                    poultry.quantity = 0;
                    poultry.status = 'sold';
                }
                await poultry.save();
            } else if (animalType === 'Livestock') {
                let livestock;
                if (tagNumber) {
                    livestock = await LiveStock.findOne({ tagNumber });
                } else if (type) {
                    livestock = await LiveStock.findOne({ type, status: 'available' });
                    if (livestock) {
                        orderTagNumber = livestock.tagNumber;
                    }
                }

                if (!livestock) {
                    return res.status(404).json({ success: false, message: 'Livestock not found or unavailable.' });
                }
                if (livestock.status === 'sold') {
                    return res.status(400).json({ success: false, message: `Livestock ${livestock.tagNumber} is already sold.` });
                }

                totalAmount = Number(pricePerUnit) * (Number(quantitySold) || 1);
                costPrice = Number(livestock.totalCost || livestock.purchasePrice || 0);
                profit = Number(pricePerUnit - costPrice) * (Number(quantitySold) || 1);

                livestock.status = 'sold';
                livestock.livestockFeedConsumed = 0;
                livestock.costPrice = 0;
                livestock.totalCost = Number(livestock.purchasePrice || 0);
                await livestock.save();
            } else {
                return res.status(400).json({ success: false, message: `Unsupported animalType: ${animalType}` });
            }

            const invoiceId = `${invoiceBase}-${index + 1}`;
            const saleDoc = await Sells.create({
                animalType,
                batchId: orderBatchId,
                tagNumber: orderTagNumber,
                pricePerUnit,
                costPrice,
                profit,
                totalAmount,
                date,
                customerName,
                quantitySold,
                status,
                buyerContact,
                invoiceId,
            });

            createdSales.push(saleDoc);
        }

        return res.status(201).json({ success: true, message: 'Sales recorded successfully.', data: createdSales });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
}

exports.getSells = async(req,res)=>{
    const { Sells } = req.farmModels
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
    const { Sells } = req.farmModels
    const id = req.params.id
    try {
        const sells = await Sells.findOne({ _id: id })
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
    const { Sells } = req.farmModels
    const id = req.params.id
    try {
        const sells = await Sells.findOne({ _id: id })
         if(!sells){
            return res.status(404).json({success:false,message:'sells not found...'})
        }
        const updateSells = await Sells.findOneAndUpdate({ _id: id }, req.body, { new:true })
        res.status(200).json({success:true,message:"sells updated successfull"})
    } catch (error) {
           console.log(error)
        res.status(500).json({success:false,message:error.message})
    }
}

exports.remove = async(req,res)=>{
    const { Sells } = req.farmModels
    const id = req.params.id
    if(!id || !mongoose.Types.ObjectId.isValid(id)){
        return res.status(400).json({success:false,message:'Invalid sell ID'})
    }
    try {
        const sells = await Sells.findOne({ _id: id })
         if(!sells){
            return res.status(404).json({success:false,message:'sells not found...'})
        }
        const del = await Sells.findOneAndDelete({ _id: id })
        res.status(200).json({success:true,message:"sells deleted successfull"})
    } catch (error) {
           console.log(error)
        res.status(500).json({success:false,message:error.message})
    }
}