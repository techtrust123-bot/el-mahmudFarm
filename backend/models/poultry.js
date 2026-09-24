const mongoose = require('mongoose')
const poultrySchema = new mongoose.Schema({
    farmId:{
        type:String
    },
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
    // chane may occur
    lastFeedUpdate:{
        type:Date,
        // default:Date.now
    },
    totalCost:{
        type:Number,
        default:0
    },
    costPerPoultry:{
        type:Number,
        default:0
    },
    poultryConsumePerBird:{
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
    purchasePricePerBird:{
        type:Number,
        default:0
     },
    birthDay:{
        type:Date,
        
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
    poultrySalePrice:{
        type:Number,
        default:0
    },
     feedHistory: [
        {
            feedStage: String,
            feedName: String,
            feedType: String,
            feedCategory: String,
            poultryConsumePerBird: Number,
            feedCostPerPoultry: Number,
            totalFeedConsumed:Number,
            totalFeedCost: Number,
            totalCost: Number,
            costPerPoultry: Number,
            totalCostPerPoultry: Number,
            quantity:Number,
            recordedAt: { type: Date, default: Date.now }
        }
    ],
},{timestamps:true})

poultrySchema.index({ farmId: 1 });
// poultrySchema.index({ batchId: 1 }); // Removed: batchId already has unique:true which creates index
poultrySchema.index({ type: 1 });
poultrySchema.index({ status: 1 });

const Poultry = mongoose.model('Poultry', poultrySchema);
module.exports = Poultry;