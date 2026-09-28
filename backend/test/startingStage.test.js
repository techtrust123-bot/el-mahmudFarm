const test = require('node:test')
const assert = require('node:assert/strict')
const {
    getFeedStageFromStartingStage,
    getFeedStagePeriodsFromStartingStage,
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
        const expected = {
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

for (const animalType of ['broiler', 'cow']) {
    const calculateHistory = animalType === 'broiler'
        ? calculateHistoricalPoultryFeed
        : calculateHistoricalLivestockFeed
    const elapsedDays = animalType === 'broiler' ? 60 : 300

    test(`${animalType} historical calculator excludes stages before startingStage`, async () => {
        const purchaseDate = new Date(Date.now() - elapsedDays * 24 * 60 * 60 * 1000)
        const expected = {
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

test('tenant schemas default missing stages and reject invalid stage values', () => {
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
    assert.equal(new Poultry({ ...poultryData, startingStage: 'random' }).validateSync().errors.startingStage.kind, 'enum')
    assert.equal(new LiveStock({ ...livestockData, startingStage: 'random' }).validateSync().errors.startingStage.kind, 'enum')
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

for (const [animalType, validations, body] of [
    ['poultry', poultryValidation, { type: 'broiler', quantity: 2, purchasePrice: 20 }],
    ['livestock', livestockValidation, { type: 'cow', breed: 'Test breed', age: 2, weight: 100 }],
]) {
    test(`${animalType} API validation rejects an invalid startingStage`, async () => {
        const request = { body: { ...body, startingStage: 'starter123' } }
        await Promise.all(validations.map((validation) => validation.run(request)))
        const errors = validationResult(request).array()
        assert.ok(errors.some((error) => error.path === 'startingStage'))
    })
}