const mongoose = require('mongoose')
require('dotenv').config()

const { resolveSrvMongoUri, buildFarmUri } = require('../utils/dbManager')
const authSchema = require('../models/auth').schema
const poultrySchema = require('../schemas/poultry')

const APPLY = process.argv.includes('--apply')

const getFarmIds = async (connection) => {
    const Auth = connection.models.Auth || connection.model('Auth', authSchema, 'auth')
    const users = await Auth.find({
        farmId: { $exists: true, $nin: [null, ''] },
    }).select('farmId').lean()

    return [...new Set(users.map((user) => String(user.farmId).trim()).filter(Boolean))].sort()
}

const getConflictingBatchIds = async (Poultry, farmId) => Poultry.aggregate([
    {
        $project: {
            batchId: { $trim: { input: { $ifNull: ['$batchId', ''] } } },
            effectiveFarmId: {
                $cond: [
                    { $in: [{ $ifNull: ['$farmId', ''] }, ['', null]] },
                    farmId,
                    '$farmId',
                ],
            },
        },
    },
    { $group: { _id: { farmId: '$effectiveFarmId', batchId: '$batchId' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
])

const isSingleFieldBatchIndex = (index) => {
    const keys = Object.entries(index.key || {})
    return index.unique === true && keys.length === 1 && keys[0][0] === 'batchId' && keys[0][1] === 1
}

const migrateFarm = async (connection, farmId) => {
    const Poultry = connection.models.Poultry || connection.model('Poultry', poultrySchema)
    const indexes = await Poultry.collection.indexes()
    const conflicts = await getConflictingBatchIds(Poultry, farmId)
    const inconsistentFarmRecords = await Poultry.find({
        farmId: { $exists: true, $nin: [null, '', farmId] },
    }).select('_id farmId batchId').lean()

    console.log(JSON.stringify({ farmId, indexes, conflicts, inconsistentFarmRecords }, null, 2))

    if (conflicts.length || inconsistentFarmRecords.length) {
        console.error(`Skipped ${farmId}: resolve duplicate batch IDs or inconsistent farm ownership first.`)
        return false
    }

    if (!APPLY) {
        console.log(`[AUDIT ONLY] ${farmId} has no conflicting batch IDs.`)
        return true
    }

    await Poultry.updateMany(
        { $or: [{ farmId: { $exists: false } }, { farmId: null }, { farmId: '' }] },
        { $set: { farmId } }
    )

    const hasCompoundUniqueIndex = indexes.some((index) =>
        index.unique === true
        && index.key?.farmId === 1
        && index.key?.batchId === 1
        && Object.keys(index.key).length === 2
    )
    if (!hasCompoundUniqueIndex) {
        await Poultry.collection.createIndex(
            { farmId: 1, batchId: 1 },
            { unique: true, name: 'farmId_1_batchId_1' }
        )
    }

    for (const index of indexes.filter(isSingleFieldBatchIndex)) {
        await Poultry.collection.dropIndex(index.name)
        console.log(`Dropped obsolete index ${index.name} for ${farmId}.`)
    }

    console.log(`[APPLIED] ${farmId} now has farm-scoped batch ID uniqueness.`)
    return true
}

const run = async () => {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI environment variable is required.')

    let centralConnection
    const failedFarmIds = []

    try {
        const mongoUri = await resolveSrvMongoUri(process.env.MONGO_URI)
        centralConnection = mongoose.createConnection(mongoUri, { autoIndex: false })
        await centralConnection.asPromise()

        const farmIds = await getFarmIds(centralConnection)
        console.log(`${APPLY ? 'Applying' : 'Auditing'} poultry batch indexes for ${farmIds.length} farm(s).`)

        for (const farmId of farmIds) {
            let farmConnection
            try {
                farmConnection = mongoose.createConnection(buildFarmUri(mongoUri, farmId), { autoIndex: false })
                await farmConnection.asPromise()
                if (!await migrateFarm(farmConnection, farmId)) failedFarmIds.push(farmId)
            } catch (error) {
                failedFarmIds.push(farmId)
                console.error(`Failed ${farmId}: ${error.message}`)
            } finally {
                if (farmConnection) await farmConnection.close()
            }
        }

        if (failedFarmIds.length) {
            throw new Error(`Resolve issues before applying or completing migration for: ${failedFarmIds.join(', ')}`)
        }
    } finally {
        if (centralConnection) await centralConnection.close()
    }
}

if (require.main === module) {
    run().catch((error) => {
        console.error(`Poultry batch uniqueness migration failed: ${error.message}`)
        process.exitCode = 1
    })
}

module.exports = { getConflictingBatchIds, isSingleFieldBatchIndex, migrateFarm, run }