const ApiError = require('./ApiError')

const assertUniquePoultryBatchId = async (Poultry, { farmId, batchId, excludeId } = {}) => {
    if (!farmId) {
        throw new ApiError(403, 'Authenticated farm context is required.')
    }

    const filter = { farmId, batchId }
    if (excludeId) filter._id = { $ne: excludeId }

    if (await Poultry.findOne(filter)) {
        throw new ApiError(400, 'Batch ID already exists in this farm.')
    }
}

module.exports = { assertUniquePoultryBatchId }