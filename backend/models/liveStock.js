const mongoose = require('mongoose');
const liveStockSchema = new mongoose.Schema({
    farmId:{
        type:String,
    },
    type:{
        type:String,
        enum:['cattle','cow','sheep','goat','horse','ram','bull'],
        required:true
    },
    tagNumber:{
        type:String,
        required:true,
        unique:true,
        trim:true
    },
    breed:{
        type:String,
        required:true
    },
    age:{
        type: Number,
        required:true
    },
    weight:{
        type: Number,
        required:true
    },
    purchaseDate:{
        type:Date,
        required:true
    },
    healthStatus:{
        type:String,
        required:true
    },
    status:{
        type:String,
        required:true,
        enum:['available','sold'],
        default:'available'
    },
    costPrice:{
        type:Number
    },
    totalFeedConsumed:{
        type:Number,
        default:0
    },
    lastFeedUpdate:{
        type:Date,
    },
    livestockFeedConsumed:{
        type:Number
    },
    totalCostforLivestock:{
        type:Number,
        default:0
    },
    totalCost:{
        type:Number
    },
    purchasePrice:{
        type:Number,
        required:true
    },
    quantity:{
        type:Number,
        default: 1
    },
 
    ageInDays:{
        type:Number,
        default:0
    },
    ageInWeeks:{
        type:Number,
        default:0
    },
    feedStage:{
        type:String,
        enum:['Starter','Grower','Finisher'],
        default:'Starter'
    },
    currentFeedType:{
        type:String,
    },
    currentFeedName:{
        type:String,
    },
    feedCostPerLivestock:{
        type:Number,
        default:0
    },
    totalFeedCost:{
        type:Number,
        default:0
    },
    livestockSalePrice:{
        type:Number,
        default:0
    },
    feedHistory: [
        {
            feedStage: String,
            feedName: String,
            feedType: String,
            feedCategory: String,
            livestockFeedConsumed: Number,
            feedCostPerLivestock: Number,
            totalFeedCost: Number,
            totalCost: Number,
            costPrice: Number,
            timestamp: { type: Date, default: Date.now }
        }
    ]
   
},{timestamps:true})

liveStockSchema.index({ farmId: 1 });
// liveStockSchema.index({ tagNumber: 1 }); // Removed: tagNumber already has unique:true which creates index
liveStockSchema.index({ type: 1 });
liveStockSchema.index({ status: 1 });

// Post hooks: trigger feed recalculation when livestock changes.
const triggerLivestockRecalc = async (doc) => {
    try {
        // lazy require to avoid circular dependency at module load time
        const { recalculateLivestockForTypeAndStage } = require('../controllers/feedController')
        const Feed = require('./feed')
        const feedCategory = doc.feedStage || doc.currentFeedStage || null
        await recalculateLivestockForTypeAndStage(doc.type, feedCategory, { Feed, LiveStock: mongoose.model('LiveStock') })
    } catch (err) {
        console.error('Error in livestock post hook recalc:', err && err.message ? err.message : err)
    }
}

liveStockSchema.post('save', function(doc) {
    setImmediate(() => triggerLivestockRecalc(doc))
})

liveStockSchema.post('remove', function(doc) {
    setImmediate(() => triggerLivestockRecalc(doc))
})

// findOneAndUpdate / findByIdAndUpdate and findOneAndDelete triggers
liveStockSchema.post('findOneAndUpdate', function(doc) {
    if (doc) setImmediate(() => triggerLivestockRecalc(doc))
})

liveStockSchema.post('findOneAndDelete', function(doc) {
    if (doc) setImmediate(() => triggerLivestockRecalc(doc))
})

const LiveStock = mongoose.model('LiveStock', liveStockSchema);
module.exports = LiveStock;