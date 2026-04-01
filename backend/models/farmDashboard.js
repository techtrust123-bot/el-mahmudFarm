const mongoose = require('mongoose')

const FarmDashboardSchema = new mongoose.Schema({
    totalLivestock: {
        type: Number,
        default: 0
    },
    totalFeedStock: {
        type: Number,
        default: 0
    },
    totalSales: {
        type: Number,
        default: 0
    },
    totalRevenue: {
        type: Number,
        default: 0
    }
})

module.exports = mongoose.model('FarmDashboard', FarmDashboardSchema)