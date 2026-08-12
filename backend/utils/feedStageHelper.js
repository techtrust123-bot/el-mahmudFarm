const MS_PER_DAY = 1000 * 60 * 60 * 24;
const POULTRY_TYPES = new Set(['broiler', 'layer'])
const LIVESTOCK_TYPES = new Set(['cow', 'cattle', 'sheep', 'goat', 'horse', 'ram', 'bull'])
const STAGE_PATTERNS = {
  Starter: /(super starter|starter|chick mash)/i,
  Grower: /(grower|grower mash)/i,
  Finisher: /(finisher|layer mash)/i,
}

// This function determines the feed stage based on the age in days and the type of animal. It uses different thresholds for poultry and livestock to categorize them into 'Starter', 'Grower', or 'Finisher' stages.
const getPoultryFeedStage = (ageInDays) => {
  if (ageInDays <= 29) return 'Starter'
  if (ageInDays <= 57) return 'Grower'
  return 'Finisher'
}

// This function determines the feed stage for livestock based on age in days. It categorizes livestock into 'Starter', 'Grower', or 'Finisher' stages using different thresholds compared to poultry.
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

const calculateAge = (purchaseDate) => {
  const now = new Date()
  const birth = new Date(purchaseDate)
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

const getFeedForStage = async (Feed, animalType, feedStage, options = {}) => {
  const normalizedAnimalType = String(animalType || '').trim().toLowerCase()
  const normalizedStage = String(feedStage || '').trim()
  const allowFallback = Boolean(options.allowFallback)

  if (!normalizedAnimalType || !normalizedStage) {
    return null
  }

  const stageRegex = STAGE_PATTERNS[normalizedStage] || new RegExp(normalizedStage, 'i')

  const exactFeed = await Feed.findOne({
    $and: [
      {
        $or: [
          { animalType: { $regex: new RegExp(`^${normalizedAnimalType}$`, 'i') } },
          { feedType: { $regex: new RegExp(`^${normalizedAnimalType}`, 'i') } },
        ],
      },
      {
        $or: [
          { feedCategory: { $regex: new RegExp(`^${normalizedStage}$`, 'i') } },
          { feedType: stageRegex },
        ],
      },
    ],
  })

  if (exactFeed) {
    return exactFeed
  }

  if (allowFallback) {
    return await Feed.findOne({
      $or: [
        { animalType: { $regex: new RegExp(`^${normalizedAnimalType}$`, 'i') } },
        { feedType: { $regex: new RegExp(`^${normalizedAnimalType}`, 'i') } },
      ],
    })
  }

  return null
}

const getPoultryFeedStagePeriods = (startAgeInDays, endAgeInDays) => {
    const startAge = Math.max(Number(startAgeInDays) || 0, 0)
    const endAge = Math.max(Number(endAgeInDays) || 0, startAge)

    if (endAge < startAge) {
        return []
    }

    const stages = [
        {
            stage: 'Starter',
            startDay: 0,
            endDay: 29,
        },
        {
            stage: 'Grower',
            startDay: 29,
            endDay: 57,
        },
        {
            stage: 'Finisher',
            startDay: 57,
            endDay: Infinity,
        },
    ]

    const periods = []

    for (const stage of stages) {
        const periodStart = Math.max(startAge, stage.startDay)
        const periodEnd = Math.min(endAge, stage.endDay)

        if (periodEnd >= periodStart) {
            periods.push({
                stage: stage.stage,
                startAgeInDays: periodStart,
                endAgeInDays: periodEnd,
                days: periodEnd - periodStart,
            })
        }
    }

    return periods
}

module.exports = { getFeedStage, calculateAge, getBirthDateFromAge, getFeedForStage, parseFeedType, normalizeFeedCategory, getPoultryFeedStagePeriods }