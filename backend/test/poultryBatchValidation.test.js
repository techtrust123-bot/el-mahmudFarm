const test = require('node:test')
const assert = require('node:assert/strict')
const poultrySchema = require('../schemas/poultry')
const { assertUniquePoultryBatchId } = require('../utils/poultryBatchValidation')

const records = [
    { _id: 'a-1', farmId: 'farm-a', batchId: 'BATCH-001' },
    { _id: 'a-2', farmId: 'farm-a', batchId: 'BATCH-002' },
    { _id: 'a-3', farmId: 'farm-a', batchId: 'BATCH-003' },
    { _id: 'b-2', farmId: 'farm-b', batchId: 'BATCH-004' },
]

const createPoultryModel = () => ({
    findOne: async (filter) => records.find((record) =>
        record.farmId === filter.farmId
        && record.batchId === filter.batchId
        && (!filter._id || record._id !== filter._id.$ne)
    ) || null,
})

test('same Batch ID is allowed in another farm', async () => {
    await assert.doesNotReject(assertUniquePoultryBatchId(createPoultryModel(), {
        farmId: 'farm-b',
        batchId: 'BATCH-001',
    }))
})

test('same Batch ID is rejected within the same farm', async () => {
    await assert.rejects(
        assertUniquePoultryBatchId(createPoultryModel(), { farmId: 'farm-a', batchId: 'BATCH-001' }),
        { statusCode: 400, message: 'Batch ID already exists in this farm.' }
    )
})

test('editing permits its current ID and IDs used only by another farm', async () => {
    await assert.doesNotReject(assertUniquePoultryBatchId(createPoultryModel(), {
        farmId: 'farm-a',
        batchId: 'BATCH-001',
        excludeId: 'a-1',
    }))
    await assert.doesNotReject(assertUniquePoultryBatchId(createPoultryModel(), {
        farmId: 'farm-a',
        batchId: 'BATCH-004',
        excludeId: 'a-3',
    }))
})

test('editing rejects a Batch ID already assigned to another batch in the same farm', async () => {
    await assert.rejects(
        assertUniquePoultryBatchId(createPoultryModel(), {
            farmId: 'farm-a',
            batchId: 'BATCH-002',
            excludeId: 'a-1',
        }),
        { statusCode: 400, message: 'Batch ID already exists in this farm.' }
    )
})

test('poultry schema uses a compound unique index, not a global batchId index', () => {
    const indexes = poultrySchema.indexes()
    assert.ok(indexes.some(([keys, options]) =>
        keys.farmId === 1 && keys.batchId === 1 && options.unique === true
    ))
    assert.equal(indexes.some(([keys, options]) =>
        options.unique === true && Object.keys(keys).length === 1 && keys.batchId === 1
    ), false)
})