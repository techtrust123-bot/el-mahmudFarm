// const LiveStock = require("../models/liveStock")
// const Feed = require('../models/feed.js')
const { recalculateLivestock, recalculateLivestockForTypeAndStage } = require('./feedController')
const { calculateLivestockConsumption } = require('../utils/feedCalculator')
const ApiError = require('../utils/ApiError')
const {
  getFeedStage,
  calculateAge,
  getBirthDateFromAge,
  getFeedForStage,
  parseFeedType,
} = require('../utils/feedStageHelper')
const {calculateHistoricalLivestockFeed} = require('../utils/historicalFeedCalculationHelper.js')
const logger = require('../utils/logger')
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

        const { ageInDays: resolvedAgeInDays, ageInWeeks: resolvedAgeInWeeks } = calculateAge(purchaseDate)
        const feedStage = getFeedStage(resolvedAgeInDays, type)


        const feed = await getFeedForStage(Feed, type, feedStage)
        if (!feed) {
            const errorMessage = `No ${type} ${feedStage} feed is configured for this farm.`
            logger.error('Missing required feed for livestock creation.', {
                farmId: req.user?.farmId || req.farmId || null,
                animalType: type,
                feedStage,
                animalId: tagNumber,
                message: errorMessage,
            })
            throw new ApiError(404, errorMessage, {
                animalType: type,
                feedStage,
                animalId: tagNumber,
                farmId: req.user?.farmId || req.farmId || null,
            })
        }
        const quantity = Number(req.body.quantity) > 0 ? Number(req.body.quantity) : 1;
        const historicalFeed = await calculateHistoricalLivestockFeed({
            Feed,
            animalType: type,
            purchaseDate,
            quantity
        })

        const totalPurchaseCost = Number(purchasePrice) || 0
        const totalCost = totalPurchaseCost + historicalFeed.totalFeedCost
        const costPrice = totalCost * quantity


        // Save the new livestock first with conservative initial values.
        const newLiveStock = new LiveStock({
            type,
            tagNumber,
            breed,
            age,
            weight,
            purchaseDate: new Date(purchaseDate || new Date()),
            lastFeedUpdate: new Date(),
            healthStatus,
            quantity,
            livestockFeedConsumed: historicalFeed.livestockFeedConsumed,
            totalFeedConsumed: historicalFeed.totalFeedConsumed,
            costPrice,
            totalCost,
            purchasePrice: totalPurchaseCost,
            ageInDays: resolvedAgeInDays,
            ageInWeeks: resolvedAgeInWeeks,
            feedStage,
            currentFeedType: feed.feedType,
            currentFeedName: feed.feedName,
            feedHistory: historicalFeed.feedHistory || [
                {
                    feedStage,
                    feedName: feed.feedName,
                    feedType: feed.feedType,
                    feedCategory: feed.feedCategory,
                    livestockFeedConsumed: historicalFeed.livestockFeedConsumed,
                    feedCostPerLivestock: historicalFeed.feedCostPerLivestock,
                    totalFeedCost: historicalFeed.totalFeedCost,
                    totalCost: totalCost,
                    costPrice: costPrice,
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
            const birthDate =  animal.purchaseDate || new Date()
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
            const birthDate = animal.purchaseDate || new Date()
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
            const birthDate = animal.purchaseDate || new Date()
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
        
        const birthDate = fetchById.purchaseDate || new Date()
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

// exports.edit = async(req,res)=>{
//     const { LiveStock, Feed } = req.farmModels
//     const {id} = req.params
//     try {
//         const exist = await LiveStock.findOne({ _id: id })
//         if(!exist){
//             return res.status(404).json({message:'Animal not Found...'})
//         }

//         const purchaseDate = req.body.purchaseDate ? new Date(req.body.purchaseDate) : new Date(exist.purchaseDate)
//         if (Number.isNaN(purchaseDate.getTime())) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Invalid purchase date.'
//             })
//         }

//         if (purchaseDate > new Date()) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Purchase date cannot be in the future.'
//             })
//         }
//         const type = req.body.type || exist.type

            // const quantity = req.body.quantity != null ? Number(req.body.quantity) : Number(exist.quantity)
//         
//         if (
//             !Number.isFinite(quantity) ||
//             quantity <= 0
//         ) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Quantity must be greater than zero.'
//             })
//         }

//          const oldPurchaseDate =
//             new Date(exist.purchaseDate)

//         const purchaseDateChanged =
//             oldPurchaseDate.getTime() !==
//             purchaseDate.getTime()


//         const typeChanged =
//             exist.type !== type

//         const needsHistoricalRecalculation =
//             purchaseDateChanged ||
//             typeChanged

//                 const {
//                     ageInDays,
//                     ageInWeeks
//                 } = calculateAge(purchaseDate)
        
//                 const currentFeedStage =
//                     getFeedStage(
//                         ageInDays,
//                         type
//                     )
        
//                 const currentFeed =
//                     await getFeedForStage(
//                         Feed,
//                         type,
//                         currentFeedStage
//                     )
        
//                 if (!currentFeed) {
//                     throw new ApiError(
//                         404,
//                         `No ${type} ${currentFeedStage} feed is configured for this farm.`,
//                         {
//                             animalType: type,
//                             feedStage: currentFeedStage,
//                             LivestockId: id
//                         }
//                     )
//                 }
            
//         let totalFeedConsumed =
//             Number(exist.totalFeedConsumed) || 0

//         let  = livestockFeedConsumed
//             Number(exist.poultryConsumePerBird) || 0

//         let totalFeedCost =
//             Number(exist.totalFeedCost) || 0

//         let feedHistory =
//             exist.feedHistory || []
        
//            if (needsHistoricalRecalculation) {
//                     const historicalFeed =
//                         await calculateHistoricalLivestockFeed({
//                             Feed,
//                             animalType: type,
//                             purchaseDate,
//                             quantity
//                         })
        
//                     totalFeedConsumed =
//                         historicalFeed.totalFeedConsumed
        
//                     livestockFeedConsumed =
//                         historicalFeed.livestockFeedConsumed
        
//                     feedCostPerLivestock =
//                         historicalFeed.feedCostPerLivestock
        
//                     totalFeedCost =
//                         historicalFeed.totalFeedCost
        
//                     feedHistory =
//                         historicalFeed.feedHistory
        
//                 }
        
//             if (
//                 !Number.isFinite(purchasePrice) ||
//                 purchasePrice < 0
//         ) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Purchase price must be a valid non-negative number.'
//             })
//         }

//          const totalCost =
//             purchasePrice +
//             totalFeedCost

//             const costPrice =
//             quantity > 0
//                 ? totalCost / quantity || 1
//                 : 0
//         // const birthDate = getBirthDateFromAge({
//         //   ageInDays: req.body.ageInDays,
//         //   ageInWeeks: req.body.ageInWeeks,
//         //   purchaseDate: purchaseDate || exist.birthDay || exist.purchaseDate,
//         // })
//         // const { ageInDays: resolvedAgeInDays, ageInWeeks: resolvedAgeInWeeks } = calculateAge(birthDate)

//         const updateData = {
//             ...req.body,
//             purchaseDate,
//             ageInDays,
//             ageInWeeks,
//             purchasePrice,

//             feedStage: currentFeedStage,

//             feedType:
//                 currentFeed.feedType,

//             currentFeedName:
//                 currentFeed.feedName,

//             totalFeedConsumed,

//             livestockFeedConsumed,


//             totalFeedCost,

//             totalCost,

//             costPrice,

//             feedHistory
//         }
        
//         if (needsHistoricalRecalculation) {
//             updateData.lastFeedUpdate =
//                 new Date()
//         }

//         const edit = await LiveStock.findOneAndUpdate({ _id: id }, updateData, {returnDocument: 'after', runValidators: true })
//         if (!edit) {
//             return res.status(404).json({ success:false, message:'Animal not found or not authorized.' })
//         }
//         return res.status(200).json({
//             success: true,
//             message: 'livestock updated successfully.',
//             data: edit
//         })

//     } catch (error) {
//         logger.error(
//             'Failed to edit livestock.',
//             {
//                 livestockId: id,
//                 error: error.message,
//                 stack: error.stack
//             }
//         )

//         return res.status(
//             error.statusCode || 500
//         ).json({
//             success: false,
//             message:
//                 error.message ||
//                 'Error while updating Livestock.'
//         })
    
//     }
// }

exports.edit = async (req, res) => {
    const { LiveStock, Feed } = req.farmModels
    const { id } = req.params

    try {
        const exist = await LiveStock.findOne({ _id: id })

        if (!exist) {
            return res.status(404).json({
                success: false,
                message: 'Animal not found...'
            })
        }

        // --------------------------------------------------
        // 1. Resolve purchase date
        // --------------------------------------------------
        const purchaseDate = req.body.purchaseDate
            ? new Date(req.body.purchaseDate)
            : new Date(exist.purchaseDate)

        if (Number.isNaN(purchaseDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid purchase date.'
            })
        }

        if (purchaseDate > new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Purchase date cannot be in the future.'
            })
        }

        // --------------------------------------------------
        // 2. Resolve type
        // --------------------------------------------------
        const type = req.body.type || exist.type

        // --------------------------------------------------
        // 3. Resolve quantity
        // --------------------------------------------------
        const quantity =
            req.body.quantity != null
                ? Number(req.body.quantity)
                : Number(exist.quantity) || 1

        if (!Number.isFinite(quantity) || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be greater than zero.'
            })
        }

        // --------------------------------------------------
        // 4. Resolve purchase price
        // --------------------------------------------------
        const purchasePrice =
            req.body.purchasePrice != null
                ? Number(req.body.purchasePrice)
                : Number(exist.purchasePrice) || 0

        if (
            !Number.isFinite(purchasePrice) ||
            purchasePrice < 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Purchase price must be a valid non-negative number.'
            })
        }

        // --------------------------------------------------
        // 5. Detect important changes
        // --------------------------------------------------
        const oldPurchaseDate = new Date(exist.purchaseDate)

        const purchaseDateChanged =
            oldPurchaseDate.getTime() !== purchaseDate.getTime()

        const typeChanged =
            String(exist.type).toLowerCase() !==
            String(type).toLowerCase()

        const quantityChanged =
            Number(exist.quantity) !== quantity

        const purchasePriceChanged =
            Number(exist.purchasePrice) !== purchasePrice

        /*
         * Historical feed must be recalculated when:
         * - purchase date changes
         * - animal type changes
         * - quantity changes
         *
         * Purchase price does NOT affect feed history.
         */
        const needsHistoricalRecalculation =
            purchaseDateChanged ||
            typeChanged ||
            quantityChanged

        // --------------------------------------------------
        // 6. Recalculate age from purchase date
        // --------------------------------------------------
        const {
            ageInDays,
            ageInWeeks
        } = calculateAge(purchaseDate)

        // --------------------------------------------------
        // 7. Determine current feed stage
        // --------------------------------------------------
        const currentFeedStage =
            getFeedStage(ageInDays, type)

        // --------------------------------------------------
        // 8. Get current stage feed
        // --------------------------------------------------
        const currentFeed =
            await getFeedForStage(
                Feed,
                type,
                currentFeedStage
            )

        if (!currentFeed) {
            throw new ApiError(
                404,
                `No ${type} ${currentFeedStage} feed is configured for this farm.`,
                {
                    animalType: type,
                    feedStage: currentFeedStage,
                    livestockId: id
                }
            )
        }

        // --------------------------------------------------
        // 9. Preserve existing feed data by default
        // --------------------------------------------------
        let totalFeedConsumed =
            Number(exist.totalFeedConsumed) || 0

        let livestockFeedConsumed =
            Number(exist.livestockFeedConsumed) || 0

        let totalFeedCost =
            Number(exist.totalFeedCost) || 0

        let feedCostPerLivestock =
            Number(exist.feedCostPerLivestock) || 0

        let feedHistory =
            Array.isArray(exist.feedHistory)
                ? exist.feedHistory
                : []

        // --------------------------------------------------
        // 10. Recalculate historical feed only when needed
        // --------------------------------------------------
        if (needsHistoricalRecalculation) {
            const historicalFeed =
                await calculateHistoricalLivestockFeed({
                    Feed,
                    animalType: type,
                    purchaseDate,
                    quantity
                })

            totalFeedConsumed =
                historicalFeed.totalFeedConsumed

            livestockFeedConsumed =
                historicalFeed.livestockFeedConsumed

            feedCostPerLivestock =
                historicalFeed.feedCostPerLivestock

            totalFeedCost =
                historicalFeed.totalFeedCost

            feedHistory =
                historicalFeed.feedHistory
        }

        // --------------------------------------------------
        // 11. Calculate total cost
        // --------------------------------------------------
        const totalCost =
            purchasePrice +
            totalFeedCost

        const costPrice =
            quantity > 0
                ? totalCost / quantity
                : 0

        // --------------------------------------------------
        // 12. Prepare update
        // --------------------------------------------------
        const updateData = {
            ...req.body,

            type,
            quantity,

            purchaseDate,
            purchasePrice,

            ageInDays,
            ageInWeeks,

            feedStage: currentFeedStage,

            currentFeedType:
                currentFeed.feedType,

            currentFeedName:
                currentFeed.feedName,

            totalFeedConsumed,

            livestockFeedConsumed,

            feedCostPerLivestock,

            totalFeedCost,

            totalCost,

            costPrice,

            feedHistory
        }

        // --------------------------------------------------
        // 13. Reset feed update date after historical rebuild
        // --------------------------------------------------
        if (needsHistoricalRecalculation) {
            updateData.lastFeedUpdate = new Date()
        }

        // --------------------------------------------------
        // 14. Save once
        // --------------------------------------------------
        const edit =
            await LiveStock.findOneAndUpdate(
                { _id: id },
                { $set: updateData },
                {
                    returnDocument: 'after',
                    runValidators: true
                }
            )

        if (!edit) {
            return res.status(404).json({
                success: false,
                message: 'Animal not found or not authorized.'
            })
        }

        return res.status(200).json({
            success: true,
            message: 'Livestock updated successfully.',
            data: edit
        })

    } catch (error) {
        logger.error('Failed to edit livestock.', {
            livestockId: id,
            error: error.message,
            stack: error.stack
        })

        return res.status(
            error.statusCode || 500
        ).json({
            success: false,
            message:
                error.message ||
                'Error while updating livestock.'
        })
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