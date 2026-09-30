const test = require('node:test')
const assert = require('node:assert/strict')
const {
    calculatePoultryAge,
    getFeedStageFromStartingStage,
    getFeedStagePeriodsFromStartingStage,
    resolvePoultryPurchaseAgeDays,
} = require('../utils/feedStageHelper')
const {
    calculateHistoricalPoultryFeed,
    calculateHistoricalLivestockFeed,
} = require('../utils/historicalFeedCalculationHelper')
const { validationResult } = require('express-validator')
const { poultryValidation, livestockValidation } = require('../middleweres/controllerValidation')
const mongoose = require('mongoose')
const poultrySchema = require('../schemas/poultry')
const livestockSchema = require('../schemas/livestock')

const cases = [
    { animalType: 'broiler', elapsedDays: 50 },
    { animalType: 'layer', elapsedDays: 140 },
    { animalType: 'cow', elapsedDays: 300 },
]

for (const { animalType, elapsedDays } of cases) {
    test(`${animalType} history starts at each selected stage`, () => {
        const expected = animalType === 'layer' ? {
            starter: ['Starter Mash', 'Grower Mash', 'Layer Mash'],
            grower: ['Grower Mash', 'Layer Mash'],
            finisher: ['Layer Mash'],
        } : {
            starter: ['Starter', 'Grower', 'Finisher'],
            grower: ['Grower', 'Finisher'],
            finisher: ['Finisher'],
        }

        for (const [startingStage, expectedStages] of Object.entries(expected)) {
            const periods = getFeedStagePeriodsFromStartingStage(
                animalType,
                elapsedDays,
                startingStage
            )
            assert.deepEqual(
                [...new Set(periods.map((period) => period.stage))],
                expectedStages
            )
        }
    })
}

test('missing or invalid starting stage preserves starter behavior', () => {
    assert.equal(getFeedStageFromStartingStage(0, 'broiler'), 'Starter')
    assert.deepEqual(
        getFeedStagePeriodsFromStartingStage('broiler', 50, 'unknown').map((period) => period.stage),
        ['Starter', 'Grower', 'Finisher']
    )
})

test('elapsed time advances from the selected stage for current-feed assignment', () => {
    assert.equal(getFeedStageFromStartingStage(0, 'broiler', 'grower'), 'Grower')
    assert.equal(getFeedStageFromStartingStage(20, 'broiler', 'grower'), 'Finisher')
    assert.equal(getFeedStageFromStartingStage(0, 'cow', 'finisher'), 'Finisher')
    assert.equal(getFeedStageFromStartingStage(120, 'cow', 'starter'), 'Starter')
    assert.equal(getFeedStageFromStartingStage(240, 'cow', 'starter'), 'Grower')
})

test('purchase age drives stage progression without including earlier stages', () => {
    const growerPeriods = getFeedStagePeriodsFromStartingStage('broiler', 20, 'grower', 21)
    assert.deepEqual(growerPeriods.map((period) => period.stage), ['Grower', 'Finisher'])
    assert.equal(growerPeriods[0].startAgeInDays, 21)
    assert.equal(growerPeriods[0].endAgeInDays, 35)
    assert.equal(getFeedStageFromStartingStage(0, 'broiler', 'grower', 21), 'Grower')
    assert.equal(getFeedStageFromStartingStage(8, 'broiler', 'grower', 21), 'Grower')
    assert.equal(getFeedStageFromStartingStage(14, 'broiler', 'grower', 21), 'Finisher')

    const finisherPeriods = getFeedStagePeriodsFromStartingStage('broiler', 10, 'finisher', 29)
    assert.deepEqual(finisherPeriods.map((period) => period.stage), ['Finisher'])
    assert.equal(finisherPeriods[0].startAgeInDays, 29)

    const starterPeriods = getFeedStagePeriodsFromStartingStage('broiler', 40, 'starter', 1)
    assert.deepEqual(starterPeriods.map((period) => period.stage), ['Starter', 'Grower', 'Finisher'])
    assert.equal(starterPeriods[0].startAgeInDays, 1)
})

test('purchase age is reflected in historical stage date ranges', async () => {
    const purchaseDate = new Date()
    purchaseDate.setHours(0, 0, 0, 0)
    const result = await calculateHistoricalPoultryFeed({
        Feed: createFeedModel(),
        animalType: 'broiler',
        purchaseDate,
        quantity: 2,
        startingStage: 'grower',
        purchaseAgeDays: 21,
    })

    assert.deepEqual(result.feedHistory.map((record) => record.feedStage), ['Grower'])
    assert.equal(result.feedHistory[0].startAgeInDays, 21)
    assert.equal(result.feedHistory[0].startDate.toISOString().slice(0, 10), purchaseDate.toISOString().slice(0, 10))
    assert.equal(result.feedHistory[0].days, calculatePoultryAge(purchaseDate, 21).elapsedDays)
})

test('historical feed snapshots each stage bag weight while preserving kilogram totals', async () => {
    const purchaseDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    const result = await calculateHistoricalPoultryFeed({
        Feed: {
            findOne: async (query) => {
                const categoryPattern = query.$and[1].$or[0].feedCategory.$regex
                const feedCategory = categoryPattern.source
                return {
                    feedName: `${feedCategory} feed`,
                    feedType: `Animal ${feedCategory}`,
                    feedCategory,
                    poultryDailyConsumption: 1,
                    poultryBagWeightKg: categoryPattern.test('starter') ? 25 : 50,
                    feedPricePerkg: 2,
                }
            },
        },
        animalType: 'broiler',
        purchaseDate,
        quantity: 1,
    })

    assert.ok(result.feedHistory.length > 1)
    assert.equal(result.totalFeedConsumed, result.feedHistory.reduce((sum, record) => sum + record.totalFeedConsumed, 0))
    assert.ok(result.feedHistory.some((record) => record.bagWeightKg === 25))
    assert.ok(result.feedHistory.some((record) => record.bagWeightKg === 50))
})

test('historical feed without a known bag weight remains unconverted', async () => {
    const result = await calculateHistoricalPoultryFeed({
        Feed: {
            findOne: async (query) => {
                const categoryPattern = query.$and[1].$or[0].feedCategory.$regex
                const feedCategory = categoryPattern.source.replace(/^\^|\$$/g, '')
                return {
                    feedName: `${feedCategory} feed`,
                    feedType: `Animal ${feedCategory}`,
                    feedCategory,
                    poultryDailyConsumption: 1,
                    feedPricePerkg: 2,
                }
            },
        },
        animalType: 'broiler',
        purchaseDate: new Date(),
        quantity: 1,
    })

    assert.equal(result.feedHistory[0].bagWeightKg, undefined)
})

test('poultry purchase age advances by calendar date without resetting', () => {
    assert.deepEqual(
        calculatePoultryAge('2026-09-29', 21, '2026-09-30'),
        { ageInDays: 22, ageInWeeks: 3, elapsedDays: 1 }
    )
})

test('legacy poultry records resolve missing acquisition age from their saved starting stage', () => {
    assert.equal(resolvePoultryPurchaseAgeDays('broiler', 'starter', undefined), 0)
    assert.equal(resolvePoultryPurchaseAgeDays('broiler', 'grower', undefined), 21)
    assert.equal(resolvePoultryPurchaseAgeDays('layer', 'grower', undefined), 56)
    assert.equal(resolvePoultryPurchaseAgeDays('broiler', 'finisher', undefined), 35)
})

const createFeedModel = () => ({
    findOne: async (query) => {
        const categoryPattern = query.$and[1].$or[0].feedCategory.$regex
        const feedCategory = categoryPattern.source.replace(/^\^|\$$/g, '')
        return {
            feedName: `${feedCategory} feed`,
            feedType: `Animal ${feedCategory}`,
            feedCategory,
            totalPoultryFeedConsumedPerday: 10,
            totalLivestockFeedConsumedPerday: 10,
            feedPricePerkg: 2,
        }
    },
})

const makeResponse = () => ({
    statusCode: null,
    body: null,
    status(statusCode) {
        this.statusCode = statusCode
        return this
    },
    json(body) {
        this.body = body
        return this
    },
})

for (const animalType of ['broiler', 'layer', 'cow']) {
    const calculateHistory = animalType === 'broiler'
        ? calculateHistoricalPoultryFeed
        : animalType === 'layer'
            ? calculateHistoricalPoultryFeed
            : calculateHistoricalLivestockFeed
    const elapsedDays = animalType === 'broiler' ? 60 : animalType === 'layer' ? 140 : 300

    test(`${animalType} historical calculator excludes stages before startingStage`, async () => {
        const purchaseDate = new Date(Date.now() - elapsedDays * 24 * 60 * 60 * 1000)
        const expected = animalType === 'layer' ? {
            starter: ['Starter Mash', 'Grower Mash', 'Layer Mash'],
            grower: ['Grower Mash', 'Layer Mash'],
            finisher: ['Layer Mash'],
        } : {
            starter: ['Starter', 'Grower', 'Finisher'],
            grower: ['Grower', 'Finisher'],
            finisher: ['Finisher'],
        }

        for (const [startingStage, expectedStages] of Object.entries(expected)) {
            const history = await calculateHistory({
                Feed: createFeedModel(),
                animalType,
                purchaseDate,
                quantity: 2,
                purchasePrice: 20,
                startingStage,
            })
            assert.deepEqual(
                history.feedHistory.map((record) => record.feedStage),
                expectedStages
            )
        }
    })
}

test('historical calculators preserve starter behavior when startingStage is absent', async () => {
    const result = await calculateHistoricalPoultryFeed({
        Feed: createFeedModel(),
        animalType: 'broiler',
        purchaseDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        quantity: 2,
    })
    assert.deepEqual(
        result.feedHistory.map((record) => record.feedStage),
        ['Starter', 'Grower', 'Finisher']
    )
})

test('tenant schemas preserve legacy defaults and validate acquired-stage fields', async () => {
    const Poultry = mongoose.model('PoultryStartingStageTest', poultrySchema)
    const LiveStock = mongoose.model('LiveStockStartingStageTest', livestockSchema)
    const poultryData = {
        batchId: 'TEST-STAGE-POULTRY',
        type: 'broiler',
        quantity: 2,
        purchaseDate: new Date(),
        purchasePrice: 20,
        vaccinationStatus: 'pending',
    }
    const livestockData = {
        type: 'cow',
        tagNumber: 'TEST-STAGE-LIVESTOCK',
        breed: 'Test breed',
        age: 2,
        weight: 100,
        purchaseDate: new Date(),
        purchasePrice: 20,
        healthStatus: 'healthy',
    }

    const poultry = new Poultry(poultryData)
    const livestock = new LiveStock(livestockData)
    assert.equal(poultry.startingStage, 'starter')
    assert.equal(livestock.startingStage, 'starter')
    assert.equal(poultry.purchaseStage, undefined)
    assert.equal(poultry.purchaseAgeDays, undefined)
    await assert.rejects(
        new Poultry({ ...poultryData, startingStage: 'random' }).validate(),
        (error) => error.errors.startingStage.kind === 'enum'
    )
    await assert.rejects(
        new LiveStock({ ...livestockData, startingStage: 'random' }).validate(),
        (error) => error.errors.startingStage.kind === 'enum'
    )
    await assert.rejects(
        new Poultry({ ...poultryData, purchaseStage: 'random' }).validate(),
        (error) => error.errors.purchaseStage.kind === 'enum'
    )
    await assert.rejects(
        new Poultry({ ...poultryData, purchaseAgeDays: -1 }).validate(),
        (error) => error.errors.purchaseAgeDays.kind === 'min'
    )
})

test('editing poultry startingStage replaces stale historical stages', async () => {
    const purchaseDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    const existing = {
        _id: 'poultry-1',
        type: 'broiler',
        startingStage: 'grower',
        quantity: 2,
        mortality: 0,
        purchaseDate,
        purchasePrice: 20,
        poultrySalePrice: 0,
        totalFeedConsumed: 10,
        poultryConsumePerBird: 5,
        feedCostPerPoultry: 10,
        totalFeedCost: 20,
        feedHistory: [{ feedStage: 'Grower' }, { feedStage: 'Finisher' }],
    }
    const Poultry = {
        findById: async () => existing,
        findOne: async () => null,
        findByIdAndUpdate: async (_id, update) => ({ ...existing, ...update }),
    }
    const response = makeResponse()

    await require('../controllers/poultryController').editPoultry({
        params: { id: existing._id },
        body: {
            type: existing.type,
            startingStage: 'finisher',
            quantity: existing.quantity,
            mortality: 0,
            purchaseDate: purchaseDate.toISOString(),
            purchasePrice: existing.purchasePrice,
        },
        farmModels: { Poultry, Feed: createFeedModel() },
        user: { farmId: 'starting-stage-test-farm' },
    }, response)

    assert.equal(response.statusCode, 200)
    assert.equal(response.body.data.startingStage, 'finisher')
    assert.deepEqual(response.body.data.feedHistory.map((record) => record.feedStage), ['Finisher'])
})

test('editing livestock startingStage replaces stale historical stages', async () => {
    const purchaseDate = new Date(Date.now() - 300 * 24 * 60 * 60 * 1000)
    const existing = {
        _id: 'livestock-1',
        type: 'cow',
        startingStage: 'grower',
        quantity: 1,
        purchaseDate,
        purchasePrice: 20,
        totalFeedConsumed: 10,
        livestockFeedConsumed: 10,
        totalFeedCost: 20,
        feedCostPerLivestock: 20,
        feedHistory: [{ feedStage: 'Grower' }, { feedStage: 'Finisher' }],
    }
    const LiveStock = {
        findOne: async () => existing,
        findOneAndUpdate: async (_filter, update) => ({ ...existing, ...update.$set }),
    }
    const response = makeResponse()

    await require('../controllers/livestockController').edit({
        params: { id: existing._id },
        body: {
            type: existing.type,
            startingStage: 'finisher',
            quantity: existing.quantity,
            purchaseDate: purchaseDate.toISOString(),
            purchasePrice: existing.purchasePrice,
        },
        farmModels: { LiveStock, Feed: createFeedModel() },
    }, response)

    assert.equal(response.statusCode, 200)
    assert.equal(response.body.data.startingStage, 'finisher')
    assert.deepEqual(response.body.data.feedHistory.map((record) => record.feedStage), ['Finisher'])
})

test('poultry API validation requires a valid purchaseStage and purchaseAgeDays', async () => {
    const body = {
        type: 'broiler',
        quantity: 2,
        purchasePrice: 20,
        purchaseDate: new Date().toISOString(),
    }

    for (const purchaseStage of ['starter', 'grower', 'finisher']) {
        const request = { body: { ...body, purchaseStage, purchaseAgeDays: 21 } }
        await Promise.all(poultryValidation.map((validation) => validation.run(request)))
        assert.equal(validationResult(request).array().some((error) => ['purchaseStage', 'purchaseAgeDays'].includes(error.path)), false)
    }

    for (const invalid of [
        { purchaseStage: 'abc', purchaseAgeDays: 21 },
        { purchaseStage: 'finisher', purchaseAgeDays: '21x' },
        { purchaseStage: null, purchaseAgeDays: 21 },
        { purchaseStage: 'starter', purchaseAgeDays: null },
    ]) {
        const request = { body: { ...body, ...invalid } }
        await Promise.all(poultryValidation.map((validation) => validation.run(request)))
        assert.ok(validationResult(request).array().some((error) => ['purchaseStage', 'purchaseAgeDays'].includes(error.path)))
    }
})

test('livestock startingStage validation remains independent of poultry purchase-age fields', async () => {
    for (const startingStage of ['starter', 'grower', 'finisher']) {
        const request = { body: { type: 'cow', breed: 'Test breed', age: 2, weight: 100, startingStage } }
        await Promise.all(livestockValidation.map((validation) => validation.run(request)))
        assert.equal(validationResult(request).array().some((error) => error.path === 'startingStage'), false)
    }
})