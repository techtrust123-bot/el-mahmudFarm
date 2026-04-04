const mongoose = require('mongoose');

const liveStockSchema = new mongoose.Schema({
    type:{
        type:String,
        enum:['cattle','cow','sheep','goat','house','ram','bool'],
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
        type:String,
        required:true
    },
    joinDate:{
        type:Date,
        default:Date.now
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
    birthDay:{
        type:Date,
        default:Date.now
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
    feedHistory: [
        {
            feedStage: String,
            feedName: String,
            feedType: String,
            feedCategory: String,
            livestockFeedConsumed: Number,
            feedCostPerAnimal: Number,
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