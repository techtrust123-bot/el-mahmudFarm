const MS_PER_DAY = 1000 * 60 * 60 * 24;
const POULTRY_TYPES = new Set(['broiler', 'layer'])
const LIVESTOCK_TYPES = new Set(['cow', 'cattle', 'sheep', 'goat', 'horse', 'ram', 'bull'])

const getPoultryFeedStage = (ageInDays) => {
  if (ageInDays <= 28) return 'Starter'
  if (ageInDays <= 56) return 'Grower'
  return 'Finisher'
}

const getLivestockFeedStage = (ageInDays) => {
  if (ageInDays <= 120) return 'Starter'
  if (ageInDays <= 240) return 'Grower'
  return 'Finisher'
}

const getFeedStage = (ageInDays, animalType) => {
  if (!animalType) {
    return getPoultryFeedStage(ageInDays)
  }

  const normalizedType = animalType.toLowerCase()
  if (LIVESTOCK_TYPES.has(normalizedType)) {
    return getLivestockFeedStage(ageInDays)
  }

  return getPoultryFeedStage(ageInDays)
}

const calculateAge = (birthDate) => {
  const now = new Date()
  const birth = new Date(birthDate)
  const diffMs = now - birth
  const ageInDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
  const ageInWeeks = Math.floor(ageInDays / 7)
  return { ageInDays, ageInWeeks }
}

const getBirthDateFromAge = ({ ageInDays, ageInWeeks, purchaseDate }) => {
  if (Number.isFinite(Number(ageInDays)) && Number(ageInDays) >= 0) {
    const result = new Date()
    result.setHours(0, 0, 0, 0)
    result.setTime(result.getTime() - Number(ageInDays) * MS_PER_DAY)
    return result
  }

  if (Number.isFinite(Number(ageInWeeks)) && Number(ageInWeeks) >= 0) {
    const result = new Date()
    result.setHours(0, 0, 0, 0)
    result.setTime(result.getTime() - Number(ageInWeeks) * 7 * MS_PER_DAY)
    return result
  }

  return purchaseDate ? new Date(purchaseDate) : new Date()
}

const normalizeFeedCategory = (rawCategory) => {
  if (!rawCategory) return null
  const normalized = rawCategory.toLowerCase()
  if (normalized.includes('super starter') || normalized.includes('starter') || normalized.includes('chick mash')) {
    return 'Starter'
  }
  if (normalized.includes('grower')) {
    return 'Grower'
  }
  if (normalized.includes('finisher') || normalized.includes('layer mash')) {
    return 'Finisher'
  }
  return null
}

const parseFeedType = (rawFeedType) => {
  if (!rawFeedType) return { animalType: null, poultryType: null, feedCategory: null }
  const normalized = rawFeedType.toLowerCase()
  const typeMatch = normalized.match(/\b(broiler|layer|cow|goat|sheep|cattle|horse|ram|bool)\b/)
  const animalType = typeMatch ? typeMatch[1] : null
  const isPoultry = animalType && POULTRY_TYPES.has(animalType)
  const poultryType = isPoultry ? animalType : null
  const categoryMatch = normalized.match(/\b(super starter|starter|chick mash|grower mash|grower|finisher|layer mash)\b/)
  const feedCategory = normalizeFeedCategory(categoryMatch ? categoryMatch[1] : '')
  return { animalType, poultryType, feedCategory }
}

const getFeedForStage = async (Feed, animalType, feedStage) => {
  if (!animalType && !feedStage) {
    return await Feed.findOne()
  }

  if (!animalType) {
    return await Feed.findOne({ feedType: { $regex: new RegExp(feedStage, 'i') } })
  }

  if (!feedStage) {
    return await Feed.findOne({ feedType: { $regex: new RegExp(`^${animalType}`, 'i') } })
  }

  const stagePatterns = {
    Starter: /(super starter|starter|chick mash)/i,
    Grower: /(grower|grower mash)/i,
    Finisher: /(finisher|layer mash)/i,
  }
  const stageRegex = stagePatterns[feedStage] || new RegExp(feedStage, 'i')

  let feed = await Feed.findOne({
    $and: [
      { feedType: { $regex: new RegExp(`^${animalType}`, 'i') } },
      { feedType: stageRegex }
    ]
  })

  if (!feed) {
    feed = await Feed.findOne({
      $and: [
        {
          $or: [
            { animalType: { $regex: new RegExp(`^${animalType}$`, 'i') } },
            { feedType: { $regex: new RegExp(`^${animalType}`, 'i') } }
          ]
        },
        {
          $or: [
            { feedCategory: { $regex: stageRegex } },
            { feedType: stageRegex }
          ]
        }
      ]
    })
  }

  if (!feed) {
    feed = await Feed.findOne({
      feedType: { $regex: new RegExp(`^${animalType}`, 'i') }
    })
  }

  return feed
}

module.exports = { getFeedStage, calculateAge, getBirthDateFromAge, getFeedForStage, parseFeedType, normalizeFeedCategory }