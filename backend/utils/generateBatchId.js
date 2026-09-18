const logger = require('./logger');
const ApiError = require('./ApiError');

/**
 * Generates a strictly increasing, left-padded batch identifier for a specific farm database.
 *
 * The utility uses the tenant-scoped Counter collection and performs an atomic
 * increment via findOneAndUpdate + $inc + upsert. This guarantees that concurrent
 * requests in the same farm database cannot produce duplicate sequence values.
 *
 * @param {import('mongoose').Model} counterModel - The tenant-scoped Counter model.
 * @param {string} counterName - The logical counter key to increment (for example, "poultryBatch").
 * @returns {Promise<string>} A zero-padded 3-digit batch identifier, for example "001".
 * @throws {ApiError} When the counter model is missing, the counter name is invalid, or the DB update fails.
 */
async function generateBatchId(counterModel, counterName) {
  if (!counterModel || typeof counterModel.findOneAndUpdate !== 'function') {
    throw new ApiError(500, 'Counter model is required for batch ID generation.');
  }

  if (typeof counterName !== 'string' || !counterName.trim()) {
    throw new ApiError(400, 'A valid counter name is required for batch ID generation.');
  }

  const normalizedCounterName = counterName.trim();

  try {
    const updatedCounter = await counterModel.findOneAndUpdate(
      { _id: normalizedCounterName },
      { $inc: { seq: 1 } },
      {
        upsert: true,
        returnDocument: 'after',
        setDefaultsOnInsert: true,
      }
    );

    const sequenceValue = Number(updatedCounter?.seq ?? 0);
    const batchId = String(sequenceValue).padStart(3, '0');

    logger.info('Generated batch identifier.', {
      counterName: normalizedCounterName,
      batchId,
      sequenceValue,
    });

    return batchId;
  } catch (error) {
    logger.error('Failed to generate batch identifier.', {
      counterName: normalizedCounterName,
      error: error.message,
      stack: error.stack,
    });

    throw new ApiError(500, 'Failed to generate batch ID.', error);
  }
}

module.exports = {
  generateBatchId,
};
