const test = require('node:test')
const assert = require('node:assert/strict')
const { recalculateFeedDependents } = require('../services/feedConsumptionService')
const { normalizeFeedQuantity, getFeedQuantityKg } = require('../utils/feedQuantity')
const { removePoultry } = require('../controllers/poultryController')

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000)

const makeFeed = (id, animalType, stage, totalPerDay = 10) => ({
  _id: id,
  animalType,
  feedType: `${animalType} ${stage}`,
  feedCategory: stage,
  feedName: `${animalType} ${stage} feed`,
  quantity: 250,
  quantityKg: 250,
  unit: 'bag',
  quantityEntered: 10,
  bagWeightKg: 25,
  totalPoultryFeedConsumedPerday: ['broiler', 'layer'].includes(animalType) ? totalPerDay : 0,
  totalLivestockFeedConsumedPerday: ['broiler', 'layer'].includes(animalType) ? 0 : totalPerDay,
  poultryDailyConsumption: 0,
  livestockDailyConsumption: 0,
  feedPricePerkg: 2,
})

const makeAnimal = (id, type, quantity, purchaseDate, isPoultry) => ({
  _id: id,
  type,
  quantity,
  purchaseDate,
  startingStage: 'starter',
  ...(isPoultry ? { purchaseStage: 'starter', purchaseAgeDays: 0 } : {}),
  purchasePrice: 100,
  status: 'available',
  totalFeedConsumed: 999999,
  totalFeedCost: 999999,
  feedHistory: [{ feedStage: 'stale record', totalFeedConsumed: 999999 }],
})

const matches = (record, query) => {
  if (!query) return true
  if (query.$and) return query.$and.every((part) => matches(record, part))
  if (query.$or) return query.$or.some((part) => matches(record, part))

  return Object.entries(query).every(([key, condition]) => {
    const value = record[key]
    if (condition && typeof condition === 'object' && condition.$regex) {
      const regex = condition.$regex instanceof RegExp
        ? condition.$regex
        : new RegExp(condition.$regex, condition.$options)
      return regex.test(String(value || ''))
    }
    if (condition && typeof condition === 'object' && condition.$ne !== undefined) {
      return value !== condition.$ne
    }
    return value === condition
  })
}

const createModel = (records) => ({
  async find(query) {
    return records.filter((record) => matches(record, query))
  },
  async findOne(query) {
    return records.find((record) => matches(record, query)) || null
  },
  async findByIdAndUpdate(id, update) {
    const record = records.find((item) => String(item._id) === String(id))
    if (!record) return null
    Object.assign(record, update.$set || update)
    return record
  },
  async findByIdAndDelete(id) {
    const index = records.findIndex((item) => String(item._id) === String(id))
    if (index < 0) return null
    return records.splice(index, 1)[0]
  },
  async create(record) {
    records.push(record)
    return record
  },
  async bulkWrite(operations) {
    for (const operation of operations) {
      const { filter, update } = operation.updateOne
      const record = records.find((item) => String(item._id) === String(filter._id))
      if (record) Object.assign(record, update.$set)
    }
    return { modifiedCount: operations.length }
  },
})

const createFarmModels = ({ feeds, poultry = [], livestock = [], eggs = [] }) => ({
  Feed: createModel(feeds),
  Poultry: createModel(poultry),
  LiveStock: createModel(livestock),
  Egg: createModel(eggs),
})

test('feed edits replace stale poultry totals using updated KG/day rates', async () => {
  const feeds = [
    makeFeed('broiler-starter', 'broiler', 'starter', 10),
    makeFeed('broiler-grower', 'broiler', 'grower', 10),
    makeFeed('broiler-finisher', 'broiler', 'finisher', 10),
  ]
  const poultry = [
    makeAnimal('batch-a', 'broiler', 10, daysAgo(60), true),
    makeAnimal('batch-b', 'broiler', 20, daysAgo(60), true),
  ]
  const farmModels = createFarmModels({ feeds, poultry })
  const beforeEdit = { ...feeds[0] }
  const initialBagStock = normalizeFeedQuantity({ quantity: 2, unit: 'bag', bagWeightKg: 25 })
  const editedBagStock = normalizeFeedQuantity({ quantity: 3, unit: 'bag', bagWeightKg: 25 })
  assert.equal(initialBagStock.quantityKg, 50)
  assert.equal(editedBagStock.quantityKg, 75)
  assert.equal(normalizeFeedQuantity({ quantity: 2, unit: 'bag', bagWeightKg: 50 }).quantityKg, 100)

  feeds[0].quantity = editedBagStock.quantityKg
  feeds[0].quantityKg = editedBagStock.quantityKg
  feeds[0].quantityEntered = editedBagStock.quantityEntered
  feeds[0].unit = editedBagStock.unit
  feeds[0].bagWeightKg = editedBagStock.bagWeightKg
  assert.equal(getFeedQuantityKg(feeds[0]), 75)

  await recalculateFeedDependents([beforeEdit], farmModels)
  const previousTotal = poultry.reduce((sum, bird) => sum + bird.totalFeedConsumed, 0)
  assert.ok(previousTotal > 0)
  assert.ok(poultry.every((bird) => !bird.feedHistory.some((entry) => entry.feedStage === 'stale record')))

  feeds[0].totalPoultryFeedConsumedPerday = 20
  await recalculateFeedDependents([beforeEdit, feeds[0]], farmModels)

  const updatedTotal = poultry.reduce((sum, bird) => sum + bird.totalFeedConsumed, 0)
  assert.ok(updatedTotal > previousTotal)
  assert.equal(feeds[0].poultryDailyConsumption, 20 / 30)
  assert.ok(poultry.every((bird) => Math.abs(bird.totalFeedConsumed - bird.feedHistory.reduce((sum, entry) => sum + entry.totalFeedConsumed, 0)) < 1e-8))
})

test('feed deletion removes the deleted stage from poultry history', async () => {
  const feeds = [
    makeFeed('broiler-starter', 'broiler', 'starter', 10),
    makeFeed('broiler-grower', 'broiler', 'grower', 10),
    makeFeed('broiler-finisher', 'broiler', 'finisher', 10),
  ]
  const poultry = [makeAnimal('batch-a', 'broiler', 10, daysAgo(60), true)]
  const farmModels = createFarmModels({ feeds, poultry })
  await recalculateFeedDependents([feeds[1]], farmModels)
  const totalBeforeDelete = poultry[0].totalFeedConsumed

  const [deletedFeed] = feeds.splice(1, 1)
  await recalculateFeedDependents([deletedFeed], farmModels)

  assert.ok(poultry[0].totalFeedConsumed < totalBeforeDelete)
  assert.ok(!poultry[0].feedHistory.some((entry) => entry.feedStage.toLowerCase() === 'grower'))
  assert.ok(poultry.every((bird) => !bird.feedHistory.some((entry) => entry.feedStage === 'stale record')))
})

test('feed edits rebuild livestock totals separately from poultry', async () => {
  const feeds = [
    makeFeed('cow-starter', 'cow', 'starter', 12),
    makeFeed('cow-grower', 'cow', 'grower', 12),
    makeFeed('cow-finisher', 'cow', 'finisher', 12),
  ]
  const livestock = [
    makeAnimal('cow-a', 'cow', 2, daysAgo(300), false),
    makeAnimal('cow-b', 'cow', 3, daysAgo(300), false),
  ]
  const farmModels = createFarmModels({ feeds, livestock })

  await recalculateFeedDependents([feeds[0]], farmModels)
  const totalBeforeEdit = livestock.reduce((sum, animal) => sum + animal.totalFeedConsumed, 0)
  feeds[0].totalLivestockFeedConsumedPerday = 18
  await recalculateFeedDependents([feeds[0]], farmModels)

  const totalAfterEdit = livestock.reduce((sum, animal) => sum + animal.totalFeedConsumed, 0)
  assert.ok(totalAfterEdit > totalBeforeEdit)
  assert.equal(feeds[0].livestockDailyConsumption, 18 / 5)
  assert.ok(livestock.every((animal) => !animal.feedHistory.some((entry) => entry.feedStage === 'stale record')))
})

test('feed deletion removes the deleted stage from livestock history', async () => {
  const feeds = [
    makeFeed('cow-starter', 'cow', 'starter', 12),
    makeFeed('cow-grower', 'cow', 'grower', 12),
    makeFeed('cow-finisher', 'cow', 'finisher', 12),
  ]
  const livestock = [makeAnimal('cow-a', 'cow', 2, daysAgo(300), false)]
  const farmModels = createFarmModels({ feeds, livestock })
  await recalculateFeedDependents([feeds[1]], farmModels)
  const totalBeforeDelete = livestock[0].totalFeedConsumed

  const [deletedFeed] = feeds.splice(1, 1)
  await recalculateFeedDependents([deletedFeed], farmModels)

  assert.ok(livestock[0].totalFeedConsumed < totalBeforeDelete)
  assert.ok(!livestock[0].feedHistory.some((entry) => entry.feedStage.toLowerCase() === 'grower'))
  assert.ok(!livestock[0].feedHistory.some((entry) => entry.feedStage === 'stale record'))
})

test('layer finisher edits and deletion rebuild stored egg costs', async () => {
  const feeds = [
    makeFeed('layer-starter', 'layer', 'starter', 10),
    makeFeed('layer-grower', 'layer', 'grower', 10),
    makeFeed('layer-finisher', 'layer', 'finisher', 10),
  ]
  const eggs = [{
    _id: 'egg-a',
    poultryType: 'layer',
    totalDailyEgg: 100,
    salePrice: 5,
    damageEggs: 0,
    costPricePerEgg: 999,
  }]
  const farmModels = createFarmModels({ feeds, eggs })

  await recalculateFeedDependents([feeds[2]], farmModels)
  assert.equal(eggs[0].costPricePerEgg, 0.2)

  feeds[2].feedPricePerkg = 4
  feeds[2].totalPoultryFeedConsumedPerday = 20
  await recalculateFeedDependents([feeds[2]], farmModels)
  assert.equal(eggs[0].costPricePerEgg, 0.8)

  const [deletedFeed] = feeds.splice(2, 1)
  await recalculateFeedDependents([deletedFeed], farmModels)
  assert.equal(eggs[0].costPricePerEgg, 0)
})

test('deleting poultry rebuilds feed stage rates and remaining poultry values', async () => {
  const feeds = [
    makeFeed('broiler-starter', 'broiler', 'starter', 10),
    makeFeed('broiler-grower', 'broiler', 'grower', 10),
    makeFeed('broiler-finisher', 'broiler', 'finisher', 10),
  ]
  const poultry = [
    makeAnimal('batch-delete', 'broiler', 20, daysAgo(10), true),
    makeAnimal('batch-remain', 'broiler', 10, daysAgo(10), true),
  ]
  const farmModels = createFarmModels({ feeds, poultry })
  const response = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
  }

  await removePoultry({ params: { id: 'batch-delete' }, farmModels }, response)

  assert.equal(response.statusCode, 200)
  assert.equal(poultry.length, 1)
  assert.equal(poultry[0]._id, 'batch-remain')
  assert.equal(feeds[0].poultryDailyConsumption, 1)
  assert.ok(poultry[0].totalFeedConsumed < 999999)
  assert.ok(!poultry[0].feedHistory.some((entry) => entry.feedStage === 'stale record'))
})