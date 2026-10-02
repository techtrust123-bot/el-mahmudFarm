const MS_PER_DAY = 1000 * 60 * 60 * 24;
const POULTRY_TYPES = new Set(['broiler', 'layer'])
const LIVESTOCK_TYPES = new Set([ 'cattle', 'sheep', 'goat', 'horse',])
const STAGE_PATTERNS = {
  Starter: /(super starter|starter|chick mash)/i,
  Grower: /(grower|grower mash)/i,
  Finisher: /(finisher|layer mash)/i,
}

// This function determines the feed stage based on the age in days and the type of animal. It uses different thresholds for poultry and livestock to categorize them into 'Starter', 'Grower', or 'Finisher' stages.
const getBroilerFeedStage = (ageInDays) => {
  if (ageInDays <= 21) return 'Starter'
  if (ageInDays <= 35) return 'Grower'
  return 'Finisher'
}

const getLayerFeedStage = (ageInDays)=>{
  if (ageInDays <= 56) return 'Starter Mash'
  if (ageInDays <= 126) return 'Grower Mash'
  return 'Layer Mash'
}

// This function determines the feed stage for livestock based on age in days. It categorizes livestock into 'Starter', 'Grower', or 'Finisher' stages using different thresholds compared to poultry.
const getLivestockFeedStage = (ageInDays) => {
  if (ageInDays <= 120) return 'Starter'
  if (ageInDays <= 240) return 'Grower'
  return 'Finisher'
}

const getFeedStage = (ageInDays, animalType) => {
  if (!animalType) {
    return getBroilerFeedStage(ageInDays), getLayerFeedStage(ageInDays)
  }

  const normalizedType = animalType.toLowerCase()
  if (LIVESTOCK_TYPES.has(normalizedType)) {
    return getLivestockFeedStage(ageInDays)
  }

  return getBroilerFeedStage(ageInDays), getLayerFeedStage(ageInDays)
}

const calculateAge = (purchaseDate) => {
  const now = new Date()
  const birth = new Date(purchaseDate)
  const diffMs = now - birth
  const ageInDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
  const ageInWeeks = Math.floor(ageInDays / 7)
  return { ageInDays, ageInWeeks }
}

const calculatePoultryAge = (purchaseDate, purchaseAgeDays = 0, asOf = new Date()) => {
  const purchase = new Date(purchaseDate)
  const today = new Date(asOf)
  if (Number.isNaN(purchase.getTime()) || Number.isNaN(today.getTime())) {
    return { ageInDays: 0, ageInWeeks: 0, elapsedDays: 0 }
  }

  const purchaseDay = Date.UTC(purchase.getUTCFullYear(), purchase.getUTCMonth(), purchase.getUTCDate())
  const currentDay = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const elapsedDays = Math.max(Math.floor((currentDay - purchaseDay) / MS_PER_DAY), 0)
  const initialAge = Math.max(Math.floor(Number(purchaseAgeDays) || 0), 0)
  const ageInDays = initialAge + elapsedDays

  return { ageInDays, ageInWeeks: Math.floor(ageInDays / 7), elapsedDays }
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

  const stageKey = normalizedStage.toLowerCase().includes('starter')
    ? 'Starter'
    : normalizedStage.toLowerCase().includes('grower')
      ? 'Grower'
      : normalizedStage.toLowerCase().includes('finisher') || normalizedStage.toLowerCase().includes('layer')
        ? 'Finisher'
        : normalizedStage
  const canonicalCategory = stageKey.toLowerCase()
  const stageRegex = STAGE_PATTERNS[stageKey] || new RegExp(normalizedStage, 'i')

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
          { feedCategory: { $regex: new RegExp(`^${canonicalCategory}$`, 'i') } },
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

const getBroilerFeedStagePeriods = (startAgeInDays, endAgeInDays) => {
    const startAge = Math.max(Number(startAgeInDays) || 0, 0)
    const endAge = Math.max(Number(endAgeInDays) || 0, startAge)

    if (endAge < startAge) {
        return []
    }

    const stages = [
        {
            stage: 'Starter',
            startDay: 0,
            endDay: 21,
        },
        {
            stage: 'Grower',
            startDay: 21,
            endDay: 35,
        },
        {
            stage: 'Finisher',
            startDay: 35,
            endDay: Infinity,
        },
    ]

    const periods = []

    for (const stage of stages) {
        const periodStart = Math.max(startAge, stage.startDay)
        const periodEnd = Math.min(endAge, stage.endDay)

        if (periodEnd > periodStart) {
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

const getLayerFeedStagePeriods = (startAgeInDays, endAgeInDays) => {
    const startAge = Math.max(Number(startAgeInDays) || 0, 0)
    const endAge = Math.max(Number(endAgeInDays) || 0, startAge)

    if (endAge < startAge) {
        return []
    }

    const stages = [
        {
            stage: 'Starter Mash',
            startDay: 0,
            endDay: 56,
        },
        {
            stage: 'Grower Mash',
            startDay: 56,
            endDay: 126,
        },
        {
            stage: 'Layer Mash',
            startDay: 126,
            endDay: Infinity,
        },
    ]

    const periods = []

    for (const stage of stages) {
        const periodStart = Math.max(startAge, stage.startDay)
        const periodEnd = Math.min(endAge, stage.endDay)

        if (periodEnd > periodStart) {
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


const getLivestockFeedStagePeriods = (startAgeInDays, endAgeInDays) => {
    const startAge = Math.max(Number(startAgeInDays) || 0, 0)
    const endAge = Math.max(Number(endAgeInDays) || 0, startAge)

    if (endAge < startAge) {
        return []
    }

    const stages = [
        {
            stage: 'Starter',
            startDay: 0,
            endDay: 120,
        },
        {
            stage: 'Grower',
            startDay: 120,
            endDay: 240,
        },
        {
            stage: 'Finisher',
            startDay: 240,
            endDay: Infinity,
        },
    ]

    const periods = []

    for (const stage of stages) {
        const periodStart = Math.max(startAge, stage.startDay)
        const periodEnd = Math.min(endAge, stage.endDay)

        if (periodEnd > periodStart) {
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

  const normalizeStartingStage = (startingStage) => {
    const normalizedStage = String(startingStage || 'starter'||'starter mash').trim().toLowerCase()
    return ['starter', 'grower', 'finisher', 'starter mash', 'grower mash', 'layer mash'].includes(normalizedStage)
      ? normalizedStage
      : 'starter'|| 'starter mash'
  }

  const getStagePeriodsForAnimal = (animalType) => {
    const normalizedType = String(animalType || '').toLowerCase()
    if (LIVESTOCK_TYPES.has(normalizedType)) return getLivestockFeedStagePeriods
    if (normalizedType === 'layer') return getLayerFeedStagePeriods
    return getBroilerFeedStagePeriods
  }

  const getStartingStageAgeInDays = (animalType, startingStage = 'starter' || 'starter mash') => {
    const getStagePeriods = getStagePeriodsForAnimal(animalType)
    const stage = normalizeStartingStage(startingStage)
    const stageKey = (value) => {
      const normalizedValue = String(value || '').trim().toLowerCase()
      if (normalizedValue.includes('starter')) return 'starter'
      if (normalizedValue.includes('grower')) return 'grower'
      if (normalizedValue.includes('finisher') || normalizedValue.includes('layer')) return 'finisher'
      return normalizedValue
    }
    const startingPeriod = getStagePeriods(0, Infinity).find(
      (period) => stageKey(period.stage) === stageKey(stage)
    )
    return startingPeriod?.startAgeInDays || 0
  }

  const resolvePoultryPurchaseAgeDays = (animalType, purchaseStage, purchaseAgeDays) => {
    if (purchaseAgeDays != null && purchaseAgeDays !== '') {
      return Math.max(Math.floor(Number(purchaseAgeDays) || 0), 0)
    }
    return getStartingStageAgeInDays(animalType, purchaseStage)
  }

  const getFeedStageFromStartingStage = (elapsedDays, animalType, startingStage = 'starter', purchaseAgeDays) => {
    const normalizedStartingStage = normalizeStartingStage(startingStage)
    const normalizedType = String(animalType || '').toLowerCase()
    const initialAge = purchaseAgeDays == null
      ? getStartingStageAgeInDays(animalType, normalizedStartingStage) + (normalizedStartingStage === 'starter' ? 0 : 1)
      : Math.max(Math.floor(Number(purchaseAgeDays) || 0), 0)
    const ageInDays = initialAge + Math.max(Number(elapsedDays) || 0, 0)
    const stagePeriods = purchaseAgeDays == null
      ? []
      : getStagePeriodsForAnimal(animalType)(ageInDays, ageInDays + 1)
    const calculatedStage = stagePeriods[0]?.stage || (LIVESTOCK_TYPES.has(normalizedType)
      ? getLivestockFeedStage(ageInDays)
      : normalizedType === 'layer'
        ? getLayerFeedStage(ageInDays)
        : getBroilerFeedStage(ageInDays))
    const stageOrder = ['starter', 'grower', 'finisher', 'starter mash', 'grower mash', 'layer mash']

    return stageOrder.indexOf(calculatedStage.toLowerCase()) < stageOrder.indexOf(normalizedStartingStage)
      ? normalizedStartingStage[0].toUpperCase() + normalizedStartingStage.slice(1)
      : calculatedStage
  }

  const getFeedStagePeriodsFromStartingStage = (animalType, elapsedDays, startingStage = 'starter' || 'starter mash', purchaseAgeDays) => {
    const getStagePeriods = getStagePeriodsForAnimal(animalType)
    const startAgeInDays = purchaseAgeDays == null
      ? getStartingStageAgeInDays(animalType, startingStage)
      : Math.max(Math.floor(Number(purchaseAgeDays) || 0), 0)
    const durationInDays = Math.max(Number(elapsedDays) || 0, 0)
    const selectedStage = normalizeStartingStage(startingStage)
    const selectedStageIndex = ['starter', 'grower', 'finisher', 'starter mash', 'grower mash', 'layer mash'].indexOf(selectedStage)
    const periods = getStagePeriods(startAgeInDays, startAgeInDays + durationInDays)
    const normalizedPeriods = []

    if (durationInDays === 0 && purchaseAgeDays != null) {
      const currentStage = getFeedStageFromStartingStage(0, animalType, selectedStage, purchaseAgeDays)
      return [{
        stage: currentStage,
        startAgeInDays,
        endAgeInDays: startAgeInDays,
        days: 0,
      }]
    }

    for (const period of periods) {
      const periodIndex = ['starter', 'grower', 'finisher', 'starter mash', 'grower mash', 'layer mash'].indexOf(period.stage.toLowerCase())
      const stage = periodIndex < selectedStageIndex
        ? selectedStage[0].toUpperCase() + selectedStage.slice(1)
        : period.stage
      const previousPeriod = normalizedPeriods[normalizedPeriods.length - 1]

      if (previousPeriod && previousPeriod.stage === stage && previousPeriod.endAgeInDays === period.startAgeInDays) {
        previousPeriod.endAgeInDays = period.endAgeInDays
        previousPeriod.days += period.days
      } else {
        normalizedPeriods.push({ ...period, stage })
      }
    }

    return normalizedPeriods
  }

  module.exports = {
    getFeedStage,
    calculateAge,
    calculatePoultryAge,
    getBirthDateFromAge,
    getFeedForStage,
    parseFeedType,
    normalizeFeedCategory,
    normalizeStartingStage,
    resolvePoultryPurchaseAgeDays,
    getFeedStageFromStartingStage,
    getFeedStagePeriodsFromStartingStage,
    getBroilerFeedStagePeriods,
    getLivestockFeedStagePeriods,
    getLayerFeedStagePeriods,
  }