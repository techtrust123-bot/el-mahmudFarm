
const { recalculatePoultry, recalculateFeedDependents } = require('../services/feedConsumptionService.js')
const { calculateBatchConsumption } = require('../utils/feedCalculator')
const ApiError = require('../utils/ApiError')
const {
    getFeedStageFromStartingStage,
    calculatePoultryAge,
    resolvePoultryPurchaseAgeDays,
  getFeedForStage,
} = require('../utils/feedStageHelper')
const logger = require('../utils/logger')
const {calculateHistoricalPoultryFeed} = require('../utils/historicalFeedCalculationHelper.js')
const { sendNotification } = require('../services/emailService')
const { generateBatchId } = require('../utils/generateBatchId')
const { assertUniquePoultryBatchId } = require('../utils/poultryBatchValidation')

exports.createPoultry = async (req, res) => {
    const { Poultry, Feed, Counter } = req.farmModels
    const farmId = req.farmContext?.farmId || req.user?.farmId
    const { type, quantity, purchaseDate, vaccinationStatus, mortality, purchasePrice, ageInWeeks, ageInDays, poultrySalePrice } = req.body
    const purchaseStage = req.body.purchaseStage || req.body.startingStage || 'starter'
    const purchaseAgeDays = req.body.purchaseAgeDays == null ? 0 : Number(req.body.purchaseAgeDays)
    if (!type || !quantity || (!purchaseDate && ageInWeeks == null && ageInDays == null) || !vaccinationStatus || !purchasePrice) {
        return res.status(400).json({ message: 'All fields are required. Provide purchaseDate or ageInWeeks/ageInDays for age calculation.' })
    }
    try {
        const sequenceId = await generateBatchId(Counter, 'poultryBatch')
        const batchId = `Batch-${sequenceId}`
        await assertUniquePoultryBatchId(Poultry, { farmId, batchId })

        const { ageInDays: resolvedAgeInDays, ageInWeeks: resolvedAgeInWeeks, elapsedDays } =
        calculatePoultryAge(purchaseDate, purchaseAgeDays)

        const currentFeedStage = getFeedStageFromStartingStage(elapsedDays, type, purchaseStage, purchaseAgeDays)

        const currentFeed = await getFeedForStage(
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
            batchId,
                }
            )
        }

        const adjustedQuantity = mortality ? Number(quantity) - Number(mortality) : Number(quantity)
        if (!adjustedQuantity || adjustedQuantity <= 0) {
            return res.status(400).json({ success: false, message: 'Quantity must be greater than mortality' })
        }

        const historicalFeed = await calculateHistoricalPoultryFeed({
            Feed,
            animalType: type,
            purchaseDate,
            quantity: adjustedQuantity,
            startingStage: purchaseStage,
            purchaseAgeDays,
        })

        const totalPurchaseCost = Number(purchasePrice) || 0
        const purchPricePerBird = adjustedQuantity > 0 ? totalPurchaseCost / adjustedQuantity : 0
        const totalCost =  totalPurchaseCost + historicalFeed.totalFeedCost
        const costPerPoultry = totalCost / adjustedQuantity
        const newPoultry = new Poultry({
            farmId,
            batchId,
            type,
            status: 'available',
            quantity: adjustedQuantity,
            purchaseDate: new Date(purchaseDate || new Date()),
            startingStage: purchaseStage,
            purchaseStage,
            purchaseAgeDays,
            lastFeedUpdate: new Date(),
            vaccinationStatus,
            mortality: mortality || 0,
            purchasePrice: totalPurchaseCost,
            totalFeedConsumed: historicalFeed.totalFeedConsumed,
            totalCost: totalPurchaseCost + historicalFeed.totalFeedCost,
            costPerPoultry,
            poultryConsumePerBird: historicalFeed.poultryConsumePerBird,
            feedCostPerPoultry: historicalFeed.feedCostPerPoultry,
            totalFeedCost: historicalFeed.totalFeedCost,
            totalCostPerPoultry: totalCost / adjustedQuantity || 0,
            feedStage:currentFeedStage,
            ageInDays: resolvedAgeInDays,
            ageInWeeks: resolvedAgeInWeeks,
            currentFeedStage,
            currentFeedType: currentFeed.feedType,
            currentFeedName: currentFeed.feedName,
            poultrySalePrice: poultrySalePrice || 0,
            feedHistory: historicalFeed.feedHistory || [
                {
                    currentFeedStage,
                    currentFeedName: currentFeed.feedName,
                    currentFeedType: currentFeed.feedType,
                    feedCategory: currentFeed.feedCategory,
                    poultryConsumePerBird: historicalFeed.poultryConsumePerBird,
                    feedCostPerPoultry: historicalFeed.feedCostPerPoultry,
                    totalFeedCost: historicalFeed.totalFeedCost,
                    totalCost: totalPurchaseCost + historicalFeed.totalFeedCost,
                    costPerPoultry: costPerPoultry,
                    totalCostPerPoultry: totalCost / adjustedQuantity || 0,
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

        await recalculatePoultry(currentFeed, req.farmModels)
        res.status(201).json({ success: true, message: 'Poultry created successfully...' })
    } catch (error) {
        console.log(error)
        const duplicateBatchId = error.code === 11000
            && (error.keyPattern?.batchId || error.keyValue?.batchId)
        res.status(duplicateBatchId ? 400 : error.statusCode || 500).json({
            success: false,
            message: duplicateBatchId ? 'Batch ID already exists in this farm.' : error.message
        })
    }
}

exports.getPoultry = async (req, res) => {
    const { Poultry } = req.farmModels
    try {
        const poultryList = await Poultry.find()

        const data = poultryList.map((bird) => {
            const birthDate = bird.purchaseDate || new Date()
            const purchaseStage = bird.purchaseStage || bird.startingStage || 'starter'
            const purchaseAgeDays = resolvePoultryPurchaseAgeDays(bird.type, purchaseStage, bird.purchaseAgeDays)
            const { ageInDays, ageInWeeks, elapsedDays } = calculatePoultryAge(birthDate, purchaseAgeDays)
            const currentFeedStage = getFeedStageFromStartingStage(elapsedDays, bird.type, purchaseStage, purchaseAgeDays)
            return {
                ...bird.toObject(),
                purchaseStage,
                purchaseAgeDays,
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
            const birthDate = bird.purchaseDate || new Date()
            const purchaseStage = bird.purchaseStage || bird.startingStage || 'starter'
            const purchaseAgeDays = resolvePoultryPurchaseAgeDays(bird.type, purchaseStage, bird.purchaseAgeDays)
            const { ageInDays, ageInWeeks, elapsedDays } = calculatePoultryAge(birthDate, purchaseAgeDays)
            const currentFeedStage = getFeedStageFromStartingStage(elapsedDays, bird.type, purchaseStage, purchaseAgeDays)
            return {
                ...bird.toObject(),
                purchaseStage,
                purchaseAgeDays,
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
            const birthDate = bird.purchaseDate || new Date()
            const purchaseStage = bird.purchaseStage || bird.startingStage || 'starter'
            const purchaseAgeDays = resolvePoultryPurchaseAgeDays(bird.type, purchaseStage, bird.purchaseAgeDays)
            const { ageInDays, ageInWeeks, elapsedDays } = calculatePoultryAge(birthDate, purchaseAgeDays)
            const currentFeedStage = getFeedStageFromStartingStage(elapsedDays, bird.type, purchaseStage, purchaseAgeDays)
            return {
                ...bird.toObject(),
                purchaseStage,
                purchaseAgeDays,
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



exports.editPoultry = async (req, res) => {
    const { Poultry, Feed } = req.farmModels
    const id = req.params.id
    const farmId = req.farmContext?.farmId || req.user?.farmId

    try {
        const existingPoultry = await Poultry.findById(id)

        if (!existingPoultry) {
            return res.status(404).json({
                success: false,
                message: 'Poultry not found.'
            })
        }

        const batchId = req.body.batchId == null
            ? existingPoultry.batchId
            : String(req.body.batchId).trim()
        await assertUniquePoultryBatchId(Poultry, { farmId, batchId, excludeId: id })

        // ---------------------------------------------------------
        // 1. Resolve editable values
        // ---------------------------------------------------------

        const purchaseDate = req.body.purchaseDate
            ? new Date(req.body.purchaseDate)
            : new Date(existingPoultry.purchaseDate)

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

        const type =
            req.body.type ||
            existingPoultry.type

        const purchaseStage = req.body.purchaseStage != null
            ? req.body.purchaseStage
            : req.body.startingStage != null
                ? req.body.startingStage
                : existingPoultry.purchaseStage || existingPoultry.startingStage || 'starter'

        const purchaseAgeDays = req.body.purchaseAgeDays != null
            ? Number(req.body.purchaseAgeDays)
            : resolvePoultryPurchaseAgeDays(type, purchaseStage, existingPoultry.purchaseAgeDays)

        if (!Number.isInteger(purchaseAgeDays) || purchaseAgeDays < 0) {
            return res.status(400).json({ success: false, message: 'Purchase age must be a non-negative whole number of days.' })
        }

        const poultrySalePrice =
            req.body.poultrySalePrice != null
                ? Number(req.body.poultrySalePrice)
                : Number(existingPoultry.poultrySalePrice || 0)

        const requestedQuantity =
            req.body.quantity != null
                ? Number(req.body.quantity)
                : Number(existingPoultry.quantity)

        const mortality =
            req.body.mortality != null
                ? Number(req.body.mortality)
                : Number(existingPoultry.mortality || 0)

        if (
            !Number.isFinite(requestedQuantity) ||
            requestedQuantity <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be greater than zero.'
            })
        }

        if (
            !Number.isFinite(mortality) ||
            mortality < 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Mortality cannot be negative.'
            })
        }

        const adjustedQuantity =
            requestedQuantity - mortality

        if (adjustedQuantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be greater than mortality.'
            })
        }


        // ---------------------------------------------------------
        // 2. Determine whether feed history must be recalculated
        // ---------------------------------------------------------

        const oldPurchaseDate =
            new Date(existingPoultry.purchaseDate)

        const purchaseDateChanged =
            oldPurchaseDate.getTime() !==
            purchaseDate.getTime()

        const oldQuantity =
            Number(existingPoultry.quantity) || 0

        const quantityChanged =
            oldQuantity !== adjustedQuantity

        const typeChanged =
            existingPoultry.type !== type

        const startingStageChanged =
            (existingPoultry.purchaseStage || existingPoultry.startingStage || 'starter') !== purchaseStage

        const purchaseAgeChanged =
            Number(existingPoultry.purchaseAgeDays || 0) !== purchaseAgeDays

        const mortalityChanged =
            Number(existingPoultry.mortality || 0) !==
            mortality

        const needsHistoricalRecalculation =
            purchaseDateChanged ||
            quantityChanged ||
            typeChanged ||
            mortalityChanged ||
            startingStageChanged ||
            purchaseAgeChanged

        // ---------------------------------------------------------
        // 3. Calculate current age from purchaseDate ONLY
        // ---------------------------------------------------------

        const {
            ageInDays,
            ageInWeeks,
            elapsedDays
        } = calculatePoultryAge(purchaseDate, purchaseAgeDays)

        const currentFeedStage =
            getFeedStageFromStartingStage(
                elapsedDays,
                type,
                purchaseStage,
                purchaseAgeDays
            )

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
                    poultryId: id
                }
            )
        }

        // ---------------------------------------------------------
        // 4. Start with existing historical values
        // ---------------------------------------------------------

        let totalFeedConsumed =
            Number(existingPoultry.totalFeedConsumed) || 0

        let poultryConsumePerBird =
            Number(existingPoultry.poultryConsumePerBird) || 0

        let feedCostPerPoultry =
            Number(existingPoultry.feedCostPerPoultry) || 0

        let totalFeedCost =
            Number(existingPoultry.totalFeedCost) || 0

        let feedHistory =
            existingPoultry.feedHistory || []

        // ---------------------------------------------------------
        // 5. Recalculate historical feed ONLY when necessary
        // ---------------------------------------------------------

        if (needsHistoricalRecalculation) {
            const historicalFeed =
                await calculateHistoricalPoultryFeed({
                    Feed,
                    animalType: type,
                    purchaseDate,
                    quantity: adjustedQuantity,
                    startingStage: purchaseStage,
                    purchaseAgeDays,
                })

            totalFeedConsumed =
                historicalFeed.totalFeedConsumed

            poultryConsumePerBird =
                historicalFeed.poultryConsumePerBird

            feedCostPerPoultry =
                historicalFeed.feedCostPerPoultry

            totalFeedCost =
                historicalFeed.totalFeedCost

            feedHistory =
                historicalFeed.feedHistory

        }

        // ---------------------------------------------------------
        // 6. Purchase price
        // ---------------------------------------------------------

        const purchasePrice =
            req.body.purchasePrice != null
                ? Number(req.body.purchasePrice)
                : Number(existingPoultry.purchasePrice || 0)

        if (
            !Number.isFinite(purchasePrice) ||
            purchasePrice < 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Purchase price must be a valid non-negative number.'
            })
        }

        // ---------------------------------------------------------
        // 7. Calculate total cost
        // ---------------------------------------------------------

        const totalCost =
            purchasePrice +
            totalFeedCost

        const costPerPoultry =
            adjustedQuantity > 0
                ? totalCost / adjustedQuantity
                : 0

        const totalCostPerPoultry =
            costPerPoultry

        // ---------------------------------------------------------
        // 8. Update only the fields that should change
        // ---------------------------------------------------------

        const updateData = {
            ...req.body,

            farmId,
            batchId,

            type,

            startingStage: purchaseStage,
            purchaseStage,
            purchaseAgeDays,

            quantity: adjustedQuantity,

            mortality,

            purchaseDate,

            purchasePrice,

            poultrySalePrice,

            ageInDays,

            ageInWeeks,

            feedStage:
                currentFeedStage,

            currentFeedStage,

            currentFeedType:
                currentFeed.feedType,

            currentFeedName:
                currentFeed.feedName,

            totalFeedConsumed,

            poultryConsumePerBird,

            feedCostPerPoultry,

            totalFeedCost,

            totalCost,

            costPerPoultry,

            totalCostPerPoultry,

            feedHistory
        }

        /*
         * Historical calculation already covers everything
         * from purchaseDate up to now.
         *
         * Therefore, after a historical recalculation,
         * today's date becomes the new starting point for
         * future incremental calculations.
         */
        if (needsHistoricalRecalculation) {
            updateData.lastFeedUpdate =
                new Date()
        }

        // ---------------------------------------------------------
        // 9. IMPORTANT: save only ONCE
        // ---------------------------------------------------------

        const editedPoultry =
            await Poultry.findByIdAndUpdate(
                id,
                updateData,
                {
                    returnDocument: 'after',
                    runValidators: true
                }
            )

        return res.status(200).json({
            success: true,
            message: 'Poultry updated successfully.',
            data: editedPoultry
        })

    } catch (error) {
        logger.error(
            'Failed to edit poultry.',
            {
                poultryId: id,
                error: error.message,
                stack: error.stack
            }
        )

        const duplicateBatchId = error.code === 11000
            && (error.keyPattern?.batchId || error.keyValue?.batchId)
        return res.status(duplicateBatchId ? 400 : error.statusCode || 500).json({
            success: false,
            message: duplicateBatchId
                ? 'Batch ID already exists in this farm.'
                : error.message ||
                'Error while updating poultry.'
        })
    }
}


exports.removePoultry = async(req,res)=>{
    const { Poultry, Feed } = req.farmModels
    const id = req.params.id
    let deletedPoultry
    let affectedFeeds = []
    let didDelete = false
    let recalculationCompleted = false
    try {
        const getPoultry = await Poultry.findOne({ _id: id })
        if(!getPoultry){
            return res.status(404).json({success:false,message:"poultry not found.."})
        }
        deletedPoultry = getPoultry.toObject ? getPoultry.toObject() : { ...getPoultry }
        affectedFeeds = await Feed.find({
            $or: [
                { animalType: getPoultry.type },
                { feedType: { $regex: new RegExp(`^${getPoultry.type}`, 'i') } },
            ],
        })
        await Poultry.findByIdAndDelete(getPoultry._id)
        didDelete = true
        await recalculateFeedDependents(affectedFeeds, req.farmModels)
        recalculationCompleted = true
        res.status(200).json({success:true,message:"Poultry deleted sucessfull.."})
    } catch (error) {
        if (deletedPoultry && didDelete && !recalculationCompleted) {
            try {
                await Poultry.create(deletedPoultry)
                await recalculateFeedDependents(affectedFeeds, req.farmModels)
            } catch (rollbackError) {
                logger.error('Failed to restore poultry after feed recalculation failure.', {
                    poultryId: deletedPoultry._id,
                    error: rollbackError.message,
                    stack: rollbackError.stack,
                })
            }
        }
        console.log(error)
        res.status(500).json({message:error.message || "error while deleting poultry"})
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