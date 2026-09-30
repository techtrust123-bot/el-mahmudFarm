const normalizeFeedQuantity = ({ quantity, unit = 'kg', bagWeightKg }) => {
  if (quantity === undefined || quantity === null || quantity === '') {
    throw new Error('Quantity must be a valid number greater than zero.')
  }

  const enteredQuantity = Number(quantity)
  if (!Number.isFinite(enteredQuantity) || enteredQuantity <= 0) {
    throw new Error('Quantity must be a valid number greater than zero.')
  }

  const normalizedUnit = String(unit || 'kg').toLowerCase()
  if (!['kg', 'bag'].includes(normalizedUnit)) {
    throw new Error('Unit must be kg or bag.')
  }

  let normalizedBagWeight = null
  if (normalizedUnit === 'bag') {
    normalizedBagWeight = Number(bagWeightKg)
    if (bagWeightKg === undefined || bagWeightKg === null || bagWeightKg === '' ||
        !Number.isFinite(normalizedBagWeight) || normalizedBagWeight <= 0) {
      throw new Error('Bag weight must be a valid number greater than zero.')
    }
  }

  const quantityKg = normalizedUnit === 'bag'
    ? enteredQuantity * normalizedBagWeight
    : enteredQuantity

  if (!Number.isFinite(quantityKg) || quantityKg <= 0) {
    throw new Error('Converted feed quantity must be a valid number greater than zero.')
  }

  return {
    quantityEntered: enteredQuantity,
    unit: normalizedUnit,
    bagWeightKg: normalizedBagWeight,
    quantityKg,
  }
}

const getFeedQuantityKg = (feed) => {
  const quantityKg = Number(feed?.quantityKg)
  if (feed?.quantityKg !== undefined && feed.quantityKg !== null && Number.isFinite(quantityKg)) {
    return Math.max(quantityKg, 0)
  }

  const legacyQuantity = Number(feed?.quantity)
  return Number.isFinite(legacyQuantity) ? Math.max(legacyQuantity, 0) : 0
}

const calculateFeedPricePerKg = (cost, quantityKg) => {
  const normalizedCost = Number(cost)
  const normalizedQuantityKg = Number(quantityKg)
  if (!Number.isFinite(normalizedCost) || normalizedCost < 0 ||
      !Number.isFinite(normalizedQuantityKg) || normalizedQuantityKg <= 0) {
    throw new Error('Feed cost and normalized quantity must be valid numbers.')
  }
  return normalizedCost / normalizedQuantityKg
}

module.exports = { normalizeFeedQuantity, getFeedQuantityKg, calculateFeedPricePerKg }