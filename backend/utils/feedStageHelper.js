const getFeedStage = (ageInDays) => {
    if (ageInDays <= 28) return 'Starter'
    if (ageInDays <= 56) return 'Grower'
    return 'Finisher'
}

const calculateAge = (birthDate) => {
    const now = new Date()
    const birth = new Date(birthDate)
    const diffMs = now - birth
    const ageInDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
    const ageInWeeks = Math.floor(ageInDays / 7)
    return { ageInDays, ageInWeeks }
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
    if (!rawFeedType) return { poultryType: null, feedCategory: null }
    const normalized = rawFeedType.toLowerCase()
    const typeMatch = normalized.match(/\b(broiler|layer|cow|goat|sheep|cattle|horse|ram|bool)\b/)
    const poultryType = typeMatch ? typeMatch[1] : null
    const categoryMatch = normalized.match(/\b(super starter|starter|chick mash|grower mash|grower|finisher|layer mash)\b/)
    const feedCategory = normalizeFeedCategory(categoryMatch ? categoryMatch[1] : '')
    return { poultryType, feedCategory }
}

const getFeedForStage = async (Feed, poultryType, feedStage) => {
    if (!poultryType && !feedStage) {
        return await Feed.findOne()
    }
    if (!poultryType) {
        return await Feed.findOne({ feedType: { $regex: new RegExp(feedStage, 'i') } })
    }
    if (!feedStage) {
        return await Feed.findOne({ feedType: { $regex: new RegExp(`^${poultryType}`, 'i') } })
    }

    const stagePatterns = {
        Starter: /(super starter|starter|chick mash)/i,
        Grower: /(grower|grower mash)/i,
        Finisher: /(finisher|layer mash)/i,
    }
    const stageRegex = stagePatterns[feedStage] || new RegExp(feedStage, 'i')

    let feed = await Feed.findOne({
        $and: [
            { feedType: { $regex: new RegExp(`^${poultryType}`, 'i') } },
            { feedType: stageRegex }
        ]
    })

    if (!feed) {
        feed = await Feed.findOne({
            $and: [
                {
                    $or: [
                        { poultryType: { $regex: new RegExp(`^${poultryType}$`, 'i') } },
                        { feedType: { $regex: new RegExp(`^${poultryType}`, 'i') } }
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
            feedType: { $regex: new RegExp(`^${poultryType}`, 'i') }
        })
    }

    return feed
}

module.exports = { getFeedStage, calculateAge, getFeedForStage, parseFeedType, normalizeFeedCategory }