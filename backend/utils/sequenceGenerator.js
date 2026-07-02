// Helper to generate sequential IDs using a Counter collection per farm DB

async function getNextSequence(CounterModel, sequenceName) {
  if (!CounterModel) throw new Error('Counter model is required');
  const updated = await CounterModel.findOneAndUpdate(
    { _id: sequenceName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return updated.seq;
}

function formatPoultryBatch(seq) {
  return `POULTRY-${String(seq).padStart(6, '0')}`;
}

function formatLivestockTag(seq) {
  return `TAG-${String(seq).padStart(6, '0')}`;
}

module.exports = { getNextSequence, formatPoultryBatch, formatLivestockTag };
