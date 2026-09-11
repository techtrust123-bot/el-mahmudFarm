
const logger = require('../utils/logger.js')
const ApiError = require('../utils/ApiError')


exports.addEgg = async(req,res)=>{
    const {Egg, Poultry,Feed} = req.farmModels;
    const {poultryType, totalDailyEgg, salePrice,damageEggs} = req.body

    if(!poultryType || !totalDailyEgg){
        return logger.error({message: 'All input field are required...'})
    }if(poultryType === 'broiler'){
            return res.status(400).json({message:'this poultry type is not support for eggs'})
        }
    

    try{
        // const existPoultryType = await Poultry.findOne('layer');

        // if(!existPoultryType){
        //     return res.status(400).json({message:`${poultryType} those not exist pls add in poultry page now to proceed..`})
        // }

        const poultryExist = await Poultry.findOne({poultryType})
        if(!poultryExist){
            return logger.error({message:`poultryType not found pls add ${poultryType} to proceed...`})
        }

        if(totalDailyEgg < 0 || totalDailyEgg === 0 ||totalDailyEgg === '' ){
            return res.status(400).json({message:'this field has to be positive number..'})
        }

        // if(salePrice < 0 || salePrice === 0 || salePrice === ''){
        //     return res.status(400).json({message:' this field has to be positive number..'})
        // }

         if(damageEggs < 0 || damageEggs === 0 || damageEggs === ''){
            return res.status(400).json({message:' this field has to be positive number..'})
        }

        if(damageEggs > totalDailyEgg){
            return res.status(400).json({message:'Damage eggs can not be greaterthan total Daily Egg..'})
        }
        const availableEgg = Math.max(totalDailyEgg - damageEggs);
        
        const feedType = await Feed.findOne({feedType:'layer', feedCategory:'finisher'})
        
        if(!feedType){
            return res.status(404).json({message:`${poultryType} is not available in your farm pls add to proceed...`})
        }

        if(feedType.feedCategory !== 'finisher'){
            return res.status(400).json({message: 'no available layer that has finisher feed..'})
        }

        const feedCost = feedType.Cost;
        const pricePerEgg = Number(feedCost / availableEgg);

        const totalEggCost = Number(pricePerEgg * availableEgg);
        const cratePrice = Number(pricePerEgg * 30);

        const newEgg = new Egg({
            poultryType,
            totalDailyEgg,
            salePrice,
            damageEggs,
            costPricePerEgg:pricePerEgg,
            cratePrice:cratePrice,
            totalEggCost,
            avlDailyEgg: availableEgg
        })

        await newEgg.save();
        logger.sucess('egg added successfull..',newEgg);
        res.status(201).json({message:'Egg added successfull',data:newEgg})
        
    }catch(error){
        logger.error({message: 'error while adding egg',error})
        res.status(500).json({message:'internal server error'})
    }
}