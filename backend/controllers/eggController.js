
const logger = require('../utils/logger.js')
const ApiError = require('../utils/ApiError')
const { recalculateEggs } = require('../services/feedConsumptionService.js')

exports.addEgg = async(req,res)=>{
    const {Egg, Poultry,Feed} = req.farmModels;
    const {poultryType, totalDailyEgg, salePrice,damageEggs, batchId, AvailableEggCrates,date} = req.body

    if(!poultryType || !totalDailyEgg || !batchId || !AvailableEggCrates || !date){
        return res.status(400).json({success:false, message: 'Poultry type, total daily eggs, batch ID, available egg crates, and date are required.'})
    }
    
    try{
        const existingEgg = await Egg.findOne({ batchId });
        if(existingEgg){
            return res.status(400).json({success:false, message:`Egg record for batch ${batchId} already exists.`})
        }

        const normalizedPoultryType = String(poultryType).trim().toLowerCase();
        if (normalizedPoultryType !== 'layer') {
            return res.status(400).json({
                success: false,
                message: 'Egg records can only be created for layer poultry batches.'
            });
        }

        const poultryExist = await Poultry.findOne({
            batchId,
            type: 'layer',
            status: 'available',
            $or: [
                { currentFeedStage: 'Finisher' },
                { feedStage: 'Finisher' }
            ]
        });
        if(!poultryExist){
            return res.status(404).json({
                success: false,
                message: `Batch ${batchId} must belong to an available layer poultry record in the Finisher stage.`
            });
        }

        if(!Number.isFinite(Number(totalDailyEgg)) || Number(totalDailyEgg) <= 0){
            return res.status(400).json({message:'this field has to be positive number..'})
        }

        if(salePrice < 0 || salePrice === 0 || salePrice === ''){
            return res.status(400).json({message:' this field has to be positive number..'})
        }

         if(!Number.isFinite(Number(damageEggs)) || Number(damageEggs) < 0){
            return res.status(400).json({success:false,message:'Damage eggs must be zero or a positive number.'})
        }

        if(Number(damageEggs) >= Number(totalDailyEgg)){
            return res.status(400).json({success:false,message:'Damage eggs must be less than total daily eggs.'})
        }
        const availableEgg = Math.max(Number(totalDailyEgg) - Number(damageEggs), 0);
        
        const feedType = await Feed.findOne({
            animalType: 'layer',
            feedCategory: { $regex: /^finisher$/i },
            quantity: { $gt: 0 },
        })


        if(!feedType){
            return res.status(404).json({message:`${poultryType} feed for finisher is not available in your farm pls add to proceed...`})
        }

        if(String(feedType.feedCategory || '').toLowerCase() !== 'finisher'){
            return res.status(400).json({message: 'no available layer that has finisher feed..'})
        }

        const feedCost = Number(feedType.cost || 0);
        if (feedCost <= 0) {
            return res.status(400).json({success:false, message: 'The layer finisher feed has no valid cost.'})
        }
        const feedQuantity = Number(feedType.quantity || 0);
        if (feedQuantity <= 0) {
            return res.status(400).json({success:false, message: 'The layer finisher feed has no available quantity.'})
        }
        const feedConsuptionPerDay = Number(feedType.totalPoultryFeedConsumedPerday || 0);
        if (feedConsuptionPerDay <= 0) {
            return res.status(400).json({success:false, message: 'The layer finisher feed has no valid daily consumption value.'})
        }
        // const salePrice = Number(salePrice);
        const feedPricePerKg = Number(feedCost / feedQuantity);
        const feedConsuptionCostPerDay = Number( feedPricePerKg * feedConsuptionPerDay );
        const pricePerEgg = Number(feedConsuptionCostPerDay / availableEgg);
        const salePricePerCrate = Number(salePrice * 30);
        const totalEggCost = Number(pricePerEgg * availableEgg);
        const cratePrice = Number(pricePerEgg * 30);
        const profitPerEgg = Number(salePrice > 0 ? (salePrice - pricePerEgg) : 0);
        const totalEggProfit = Number(profitPerEgg * availableEgg);

        const newEgg = new Egg({
            batchId,
            poultryType,
            totalDailyEgg,
            salePrice,
            salePricePerCrate,
            damageEggs,
            costPricePerEgg:pricePerEgg,
            cratePrice:cratePrice,
            totalEggCost,
            avlDailyEgg: availableEgg,
            profitPerEgg,
            totalEggProfit,
            AvailableEggCrates,
            date
        })

        await newEgg.save();
        logger.info('egg added successfully..',newEgg);
        res.status(201).json({success:true,message:'Egg added successfully',data:newEgg})
        
    }catch(error){
        console.log(error)
        logger.error({message: error.message, stack: error.stack})
        res.status(500).json({message:'internal server error'})
    }
}

exports.getEggs = async(req,res)=>{
    const {Egg} = req.farmModels;
    try{
        const eggs = await Egg.find().sort({createdAt:-1});
        if(!eggs || eggs.length === 0){
            return res.status(404).json({success:false, message:'No egg records found'})
        }
        res.status(200).json({success:true, data:eggs})
    }catch(error){
        console.log(error)
        logger.error({message: error.message, stack: error.stack})
        res.status(500).json({message:'internal server error'})
    }
}

exports.getEggById = async(req,res)=>{
    const {Egg} = req.farmModels;
    const id = req.params.id;

    try{
        const egg = await Egg.findById(id);
        if(!egg){
            return res.status(404).json({success:false, message:'Egg not found'})
        }
        res.status(200).json({success:true, data:egg})
    }catch(error){
        console.log(error)
        logger.error({message: error.message, stack: error.stack})
        res.status(500).json({message:'internal server error'})
    }
}

exports.editEgg = async(req,res)=>{
    const {Egg, Feed} = req.farmModels;
    const id = req.params.id;
    const {poultryType, totalDailyEgg, salePrice,damageEggs, batchId, AvailableEggCrates} = req.body

    try{
        const egg = await Egg.findById(id);
        if(!egg){
            return res.status(404).json({success:false, message:'Egg not found'})
        }
        const updatedEgg = await Egg.findByIdAndUpdate(id, {
            totalDailyEgg:
                totalDailyEgg ?? egg.totalDailyEgg,

            salePrice:
                salePrice ?? egg.salePrice,

            damageEggs:
                damageEggs ?? egg.damageEggs,

            poultryType:
                poultryType ?? egg.poultryType,

            batchId:
                batchId ?? egg.batchId,

            AvailableEggCrates:
                AvailableEggCrates ?? egg.AvailableEggCrates,
        },{returnDocument:'after'});

        const feedType = await Feed.findOne({
            animalType: 'layer',
            feedCategory: { $regex: /^finisher$/i },
            quantity: { $gt: 0 },
        })
        
        const feedCost = Number(feedType.cost || 0);
        const feedQuantity = Number(feedType.quantity || 0);
        const feedConsuptionPerDay = Number(feedType.totalPoultryFeedConsumedPerday || 0);
        
        const recalculatedEgg = await recalculateEggs(
            updatedEgg,
            {
                totalDailyEgg: updatedEgg.totalDailyEgg,
            },
            {
                salePrice: updatedEgg.salePrice,
                feedCost
            },
            {
                feedQuantity
            },
            {
                feedConsuptionPerDay
            },
            {
                 damageEggs: updatedEgg.damageEggs,
            },
            
            req.farmModels
        );
        res.status(200).json({success:true, message:'Egg updated successfully', data: recalculatedEgg || updatedEgg})
        
    }catch(error){
        console.log(error)
        logger.error({message: error.message, stack: error.stack})
        res.status(500).json({message:'internal server error'})
    }
}

exports.deleteEgg = async(req,res)=>{
    const {Egg} = req.farmModels;
    const id = req.params.id;
    try{
        const egg = await Egg.findById(id);
        if(!egg){
            return res.status(404).json({success:false, message:'Egg not found'})
        }
        await Egg.findByIdAndDelete(id);
        res.status(200).json({success:true, message:'Egg deleted successfully'})
    }catch(error){
        console.log(error)
        logger.error({message: error.message, stack: error.stack})
        res.status(500).json({message:'internal server error'})
    }
};