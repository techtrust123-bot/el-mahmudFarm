const mongoose = require('mongoose');

const liveStockSchema = new mongoose.Schema({
    farmId:{
        type:String
    },
    type:{
        type:String,
        enum:['cattle','cow','sheep','goat','house','ram','bull'],
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

liveStockSchema.index({ type: 1 });
liveStockSchema.index({ status: 1 });

module.exports = liveStockSchema;