const assert = require('node:assert/strict')
const { normalizeFeedQuantity, getFeedQuantityKg, calculateFeedPricePerKg } = require('../utils/feedQuantity')

const cases = [
  [{ quantity: 50, unit: 'kg' }, 50],
  [{ quantity: 50, unit: 'KG' }, 50],
  [{ quantity: 1, unit: 'bag', bagWeightKg: 25 }, 25],
  [{ quantity: 4, unit: 'bag', bagWeightKg: 25 }, 100],
  [{ quantity: 1.5, unit: 'bag', bagWeightKg: 25 }, 37.5],
  [{ quantity: 0.25, unit: 'bag', bagWeightKg: 10 }, 2.5],
  [{ quantity: 2, unit: 'bag', bagWeightKg: 50 }, 100],
]

for (const [input, expectedKg] of cases) {
  assert.equal(normalizeFeedQuantity(input).quantityKg, expectedKg)
}

assert.equal(getFeedQuantityKg({ quantity: 50 }), 50)
assert.equal(getFeedQuantityKg({ quantity: 50, quantityKg: null }), 50)
assert.equal(getFeedQuantityKg({ quantity: 250, quantityKg: 200 }), 200)
assert.equal(calculateFeedPricePerKg(150, 150), 1)
assert.equal(calculateFeedPricePerKg(300, normalizeFeedQuantity({ quantity: 3, unit: 'bag', bagWeightKg: 25 }).quantityKg), 4)
assert.equal(calculateFeedPricePerKg(500, normalizeFeedQuantity({ quantity: 2, unit: 'bag', bagWeightKg: 50 }).quantityKg), 5)
assert.deepEqual(
  normalizeFeedQuantity({ quantity: 2, unit: 'bag', bagWeightKg: 25 }),
  { quantityEntered: 2, unit: 'bag', bagWeightKg: 25, quantityKg: 50 }
)

const purchase = normalizeFeedQuantity({ quantity: 10, unit: 'bag', bagWeightKg: 25 })
const usage = normalizeFeedQuantity({ quantity: 2, unit: 'bag', bagWeightKg: 25 })
const remainingKg = purchase.quantityKg - usage.quantityKg
assert.equal(remainingKg, 200)
assert.equal(remainingKg / purchase.bagWeightKg, 8)

for (const input of [
  { quantity: 0, unit: 'kg' },
  { quantity: -2, unit: 'bag', bagWeightKg: 25 },
  { quantity: 1, unit: 'bag', bagWeightKg: 0 },
  { quantity: 1, unit: 'bag', bagWeightKg: -25 },
  { quantity: 'not-a-number', unit: 'kg' },
  { quantity: 'Infinity', unit: 'kg' },
]) {
  assert.throws(() => normalizeFeedQuantity(input))
}

console.log('Feed quantity tests passed')