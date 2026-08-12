const mongoose = require('mongoose');

const poultrySchema = new mongoose.Schema({
    batchId:{
        type:String,
        required:true,
        unique:true,
        trim:true
    },
    type:{
        type:String,
        enum:['broiler','layer'],
        required:true
     },
     status:{
        type:String,
        enum:['available','sold'],
        default:'available'
     },
     quantity:{
        type:Number,
        required:true
     },
     feedStage:{
        type:String,
        enum:['Starter','Grower','Finisher'],
     },
     mortality:{
        type:Number,
        default:0
     },
    purchaseDate:{
        type:Date,
        required:true
    },
    purchasePrice:{
        type:Number,
        required:true
    },
    vaccinationStatus:{
        type:String,
        required:true
    },
    totalFeedConsumed:{
        type:Number,
        default:0
    },
    totalCost:{
        type:Number,
        default:0
    },
    costPerPoultry:{
        type:Number,
        default:0
    },
    poultryConsumePerkg:{
        type:Number,
        default:0
    },
    feedCostPerPoultry:{
        type:Number,
        default:0
    },
    totalFeedCost:{
        type:Number,
        default:0
    },
    newQuantity:{
        type:Number,
        default:0
    },
    totalCostPerPoultry:{
        type:Number,
        default:0
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
    currentFeedStage:{
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
            poultryConsumePerkg: Number,
            feedCostPerPoultry: Number,
            totalFeedCost: Number,
            totalCost: Number,
            costPerPoultry: Number,
            totalCostPerPoultry: Number,
            recordedAt: { type: Date, default: Date.now }
        }
    ],
},{timestamps:true})

poultrySchema.index({ type: 1 });
poultrySchema.index({ status: 1 });

module.exports = poultrySchema;