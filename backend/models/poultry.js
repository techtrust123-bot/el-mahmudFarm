const mongoose = require('mongoose')
const poultrySchema = new mongoose.Schema({
    farmId:{
        type:String
    },
    batchId:{
        type:String,
        required:true,
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
      startingStage:{
          type:String,
          enum:['starter','grower','finisher', 'starter mash', 'grower mash', 'layer mash'],
          default:'starter'
      },
    purchaseStage:{
        type:String,
        enum:['starter','grower','finisher', 'starter mash', 'grower mash', 'layer mash']
    },
    purchaseAgeDays:{
        type:Number,
        min:0
    },
     feedStage:{
        type:String,
        enum:['Starter','Grower','Finisher', 'Starter Mash', 'Grower Mash', 'Layer Mash'],
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
            bagWeightKg: Number,
            feedCostPerPoultry: Number,
            totalFeedConsumed:Number,
            totalFeedCost: Number,
            totalCost: Number,
            costPerPoultry: Number,
            totalCostPerPoultry: Number,
            quantity:Number,
            startAgeInDays: Number,
            endAgeInDays: Number,
            days: Number,
            startDate: Date,
            endDate: Date,
            recordedAt: { type: Date, default: Date.now }
        }
    ],
},{timestamps:true})

poultrySchema.index({ farmId: 1, batchId: 1 }, { unique: true, name: 'farmId_1_batchId_1' });
poultrySchema.index({ type: 1 });
poultrySchema.index({ status: 1 });

const Poultry = mongoose.model('Poultry', poultrySchema);
module.exports = Poultry;